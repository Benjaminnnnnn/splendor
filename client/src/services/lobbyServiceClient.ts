import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

class LobbyServiceClient {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/lobbies`;
  }

  async createLobby(request: CreateLobbyRequest): Promise<Lobby> {
    const response = await axios.post(this.baseURL, request);
    return response.data;
  }

  async getLobbyById(lobbyId: string): Promise<Lobby> {
    const response = await axios.get(`${this.baseURL}/${lobbyId}`);
    return response.data;
  }

  async listPublicLobbies(): Promise<Lobby[]> {
    const response = await axios.get(this.baseURL);
    return response.data;
  }

  async joinLobby(lobbyId: string, userId: string): Promise<Lobby> {
    const response = await axios.post(`${this.baseURL}/${lobbyId}/join`, { userId });
    return response.data;
  }

  async leaveLobby(lobbyId: string, userId: string): Promise<void> {
    await axios.post(`${this.baseURL}/${lobbyId}/leave`, { userId });
  }

  async setReadyStatus(lobbyId: string, userId: string, isReady: boolean): Promise<Lobby> {
    const response = await axios.post(`${this.baseURL}/${lobbyId}/ready`, { userId, isReady });
    return response.data;
  }

  async startGame(lobbyId: string): Promise<{ gameId: string }> {
    const response = await axios.post(`${this.baseURL}/${lobbyId}/start`);
    return response.data;
  }

  async getUserLobbies(userId: string): Promise<Lobby[]> {
    const response = await axios.get(`${this.baseURL}/user/${userId}`);
    return response.data;
  }
}

export const lobbyServiceClient = new LobbyServiceClient();
