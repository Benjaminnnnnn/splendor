import { v4 as uuidv4 } from 'uuid';
import { DatabaseConnection } from '../infrastructure/database';
import { GameService } from './gameService';

export interface Lobby {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  minPlayers: number;
  isPublic: boolean;
  status: 'waiting' | 'starting' | 'in_progress' | 'completed';
  createdAt: Date;
  startedAt?: Date;
  gameId?: string;
  participants: LobbyParticipant[];
}

export interface LobbyParticipant {
  userId: string;
  username: string;
  isReady: boolean;
  joinedAt: Date;
}

export interface CreateLobbyRequest {
  name: string;
  hostId: string;
  maxPlayers?: number;
  minPlayers?: number;
  isPublic?: boolean;
}

export interface JoinLobbyRequest {
  userId: string;
}

export class LobbyService {
  private db: DatabaseConnection;
  private gameService: GameService;

  constructor() {
    this.db = DatabaseConnection.getInstance();
    this.gameService = new GameService();
  }

  async createLobby(request: CreateLobbyRequest): Promise<Lobby> {
    const lobbyId = uuidv4();
    const now = Date.now();

    const maxPlayers = request.maxPlayers || 4;
    const minPlayers = request.minPlayers || 2;
    const isPublic = request.isPublic !== false; // Default to public

    if (maxPlayers < minPlayers) {
      throw new Error('Max players must be greater than or equal to min players');
    }
    if (maxPlayers > 4) {
      throw new Error('Max players cannot exceed 4');
    }
    if (minPlayers < 2) {
      throw new Error('Min players must be at least 2');
    }

    this.db.transaction(() => {
      // Create lobby
      this.db.run(
        `INSERT INTO lobbies (id, name, host_id, max_players, min_players, is_public, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [lobbyId, request.name, request.hostId, maxPlayers, minPlayers, isPublic ? 1 : 0, 'waiting', now]
      );

      // Add host as first participant
      this.db.run(
        `INSERT INTO lobby_participants (lobby_id, user_id, is_ready, joined_at)
         VALUES (?, ?, ?, ?)`,
        [lobbyId, request.hostId, 0, now]
      );
    });

    return this.getLobbyById(lobbyId);
  }

  /**
   * Get lobby by ID
   */
  async getLobbyById(lobbyId: string): Promise<Lobby> {
    const lobbyRow = this.db.get(
      'SELECT * FROM lobbies WHERE id = ?',
      [lobbyId]
    );

    if (!lobbyRow) {
      throw new Error('Lobby not found');
    }

    const participantRows = this.db.query(
      `SELECT lp.user_id, u.username, lp.is_ready, lp.joined_at
       FROM lobby_participants lp
       JOIN users u ON lp.user_id = u.id
       WHERE lp.lobby_id = ?
       ORDER BY lp.joined_at ASC`,
      [lobbyId]
    );

    const participants: LobbyParticipant[] = participantRows.map((row: any) => ({
      userId: row.user_id,
      username: row.username,
      isReady: row.is_ready === 1,
      joinedAt: new Date(row.joined_at),
    }));

    return {
      id: lobbyRow.id,
      name: lobbyRow.name,
      hostId: lobbyRow.host_id,
      maxPlayers: lobbyRow.max_players,
      minPlayers: lobbyRow.min_players,
      isPublic: lobbyRow.is_public === 1,
      status: lobbyRow.status,
      createdAt: new Date(lobbyRow.created_at),
      startedAt: lobbyRow.started_at ? new Date(lobbyRow.started_at) : undefined,
      gameId: lobbyRow.game_id,
      participants,
    };
  }

  /**
   * List all public lobbies
   */
  async listPublicLobbies(): Promise<Lobby[]> {
    const lobbyRows = this.db.query(
      `SELECT id FROM lobbies 
       WHERE is_public = 1 AND status = 'waiting'
       ORDER BY created_at DESC`
    );

    const lobbies: Lobby[] = [];
    for (const row of lobbyRows as any[]) {
      lobbies.push(await this.getLobbyById(row.id));
    }

    return lobbies;
  }

  async joinLobby(lobbyId: string, request: JoinLobbyRequest): Promise<Lobby> {
    const lobby = await this.getLobbyById(lobbyId);

    if (lobby.status !== 'waiting') {
      throw new Error('Lobby is not accepting new players');
    }

    if (lobby.participants.length >= lobby.maxPlayers) {
      throw new Error('Lobby is full');
    }

    const alreadyJoined = lobby.participants.some(p => p.userId === request.userId);
    if (alreadyJoined) {
      throw new Error('User already in lobby');
    }

    const now = Date.now();

    this.db.run(
      `INSERT INTO lobby_participants (lobby_id, user_id, is_ready, joined_at)
       VALUES (?, ?, ?, ?)`,
      [lobbyId, request.userId, 0, now]
    );

    return this.getLobbyById(lobbyId);
  }

  async leaveLobby(lobbyId: string, userId: string): Promise<void> {
    const lobby = await this.getLobbyById(lobbyId);

    if (lobby.status === 'in_progress') {
      throw new Error('Cannot leave a lobby that has started');
    }

    this.db.run(
      'DELETE FROM lobby_participants WHERE lobby_id = ? AND user_id = ?',
      [lobbyId, userId]
    );

    // If host left, delete the lobby or assign new host
    if (lobby.hostId === userId) {
      const remainingParticipants = this.db.query(
        'SELECT user_id FROM lobby_participants WHERE lobby_id = ?',
        [lobbyId]
      );

      if (remainingParticipants.length === 0) {
        // Delete lobby if empty
        this.db.run('DELETE FROM lobbies WHERE id = ?', [lobbyId]);
      } else {
        // Assign new host
        const newHostId = (remainingParticipants[0] as any).user_id;
        this.db.run('UPDATE lobbies SET host_id = ? WHERE id = ?', [newHostId, lobbyId]);
      }
    }
  }

  async setReadyStatus(lobbyId: string, userId: string, isReady: boolean): Promise<Lobby> {
    const lobby = await this.getLobbyById(lobbyId);

    if (lobby.status !== 'waiting') {
      throw new Error('Lobby is not in waiting state');
    }

    const participant = lobby.participants.find(p => p.userId === userId);
    if (!participant) {
      throw new Error('User not in lobby');
    }

    this.db.run(
      'UPDATE lobby_participants SET is_ready = ? WHERE lobby_id = ? AND user_id = ?',
      [isReady ? 1 : 0, lobbyId, userId]
    );

    const updatedLobby = await this.getLobbyById(lobbyId);

    // Check if all players are ready and we have enough players
    const allReady = updatedLobby.participants.every(p => p.isReady);
    const enoughPlayers = updatedLobby.participants.length >= updatedLobby.minPlayers;

    if (allReady && enoughPlayers) {
      // Auto-start the game
      await this.startGame(lobbyId);
      return this.getLobbyById(lobbyId);
    }

    return updatedLobby;
  }

  async startGame(lobbyId: string): Promise<string> {
    const lobby = await this.getLobbyById(lobbyId);

    if (lobby.status !== 'waiting') {
      throw new Error('Lobby already started or completed');
    }

    if (lobby.participants.length < lobby.minPlayers) {
      throw new Error('Not enough players to start game');
    }

    // Update lobby status
    this.db.run(
      'UPDATE lobbies SET status = ? WHERE id = ?',
      ['starting', lobbyId]
    );

    // Create game with first participant as creator
    const hostParticipant = lobby.participants.find(p => p.userId === lobby.hostId);
    if (!hostParticipant) {
      throw new Error('Host not found in participants');
    }

    const gameResponse = await this.gameService.createGame({
      playerName: hostParticipant.username,
      lobbyName: lobby.name,
      isPrivate: !lobby.isPublic,
    });

    const gameId = gameResponse.game.id;

    // Add other participants to the game
    for (const participant of lobby.participants) {
      if (participant.userId !== lobby.hostId) {
        await this.gameService.joinGame(gameId, {
          playerName: participant.username,
        });
      }
    }

    const now = Date.now();

    // Update lobby with game ID and status
    this.db.run(
      'UPDATE lobbies SET game_id = ?, status = ?, started_at = ? WHERE id = ?',
      [gameId, 'in_progress', now, lobbyId]
    );

    return gameId;
  }

  async getUserLobbies(userId: string): Promise<Lobby[]> {
    const lobbyRows = this.db.query(
      `SELECT DISTINCT l.id FROM lobbies l
       JOIN lobby_participants lp ON l.id = lp.lobby_id
       WHERE lp.user_id = ? AND l.status IN ('waiting', 'starting', 'in_progress')
       ORDER BY l.created_at DESC`,
      [userId]
    );

    const lobbies: Lobby[] = [];
    for (const row of lobbyRows as any[]) {
      lobbies.push(await this.getLobbyById(row.id));
    }

    return lobbies;
  }

  async completeLobby(lobbyId: string): Promise<void> {
    this.db.run(
      'UPDATE lobbies SET status = ? WHERE id = ?',
      ['completed', lobbyId]
    );
  }
}
