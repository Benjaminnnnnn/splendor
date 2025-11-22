import axios from 'axios';
import { Game, TokenBank } from '../../../shared/types/game';
import { GameEngine } from '../game/GameEngine';

export interface GameJoinResponse {
  game: Game;
  playerId: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class GameService {
  private baseURL: string;
  private gameEngine: GameEngine;

  constructor() {
    this.baseURL = `${API_BASE_URL}/games`;
    this.gameEngine = new GameEngine();
  }

  async createGame(playerName: string, isPrivate: boolean = false, lobbyName: string, userId?: string): Promise<GameJoinResponse> {
    const response = await axios.post(this.baseURL, { playerName, isPrivate, lobbyName, userId });
    return response.data;
  }

  async getGame(gameId: string): Promise<Game> {
    const url = `${this.baseURL}/${gameId}`;
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('[GameService] Error occurred:');
      console.error('[GameService] Error type:', error.constructor.name);
      console.error('[GameService] Error message:', error.message);
      console.error('[GameService] Error code:', error.code);
      console.error('[GameService] Full error:', error);
      if (error.response) {
        console.error('[GameService] Response status:', error.response.status);
        console.error('[GameService] Response data:', error.response.data);
      } else if (error.request) {
        console.error('[GameService] No response received. Request was:', error.request);
      }
      throw error;
    }
  }

  async joinGame(gameId: string, playerName: string, userId?: string): Promise<GameJoinResponse> {
    const response = await axios.post(`${this.baseURL}/${gameId}/join`, { playerName, userId });
    return response.data;
  }

  async joinGameByInviteCode(inviteCode: string, playerName: string, userId?: string): Promise<GameJoinResponse> {
    const response = await axios.post(`${this.baseURL}/join-by-invite`, { inviteCode, playerName, userId });
    return response.data;
  }

  async leaveGame(gameId: string, playerId: string): Promise<Game> {
    const response = await axios.post(`${this.baseURL}/${gameId}/leave`, { playerId });
    return response.data;
  }

  async kickPlayer(gameId: string, hostPlayerId: string, playerIdToKick: string): Promise<Game> {
    const response = await axios.post(`${this.baseURL}/${gameId}/kick`, { hostPlayerId, playerIdToKick });
    return response.data;
  }

  async listGames(): Promise<Game[]> {
    const response = await axios.get(this.baseURL);
    return response.data;
  }

  async takeTokens(gameId: string, playerId: string, tokens: Partial<TokenBank>): Promise<Game> {
    const currentGame = await this.getGame(gameId);
    this.gameEngine.takeTokens(currentGame, playerId, tokens);
    const response = await axios.post(`${this.baseURL}/${gameId}/actions/take-tokens`, {
      playerId,
      tokens
    });
    return response.data;
  }

  async purchaseCard(gameId: string, playerId: string, cardId: string, payment?: Partial<TokenBank>): Promise<Game> {
    const currentGame = await this.getGame(gameId);
    this.gameEngine.purchaseCard(currentGame, playerId, cardId, payment);
    const response = await axios.post(`${this.baseURL}/${gameId}/actions/purchase-card`, {
      playerId,
      cardId,
      payment
    });
    return response.data;
  }

  async reserveCard(gameId: string, playerId: string, cardId: string): Promise<Game> {
    const currentGame = await this.getGame(gameId);
    this.gameEngine.reserveCard(currentGame, playerId, cardId);
    const response = await axios.post(`${this.baseURL}/${gameId}/actions/reserve-card`, {
      playerId,
      cardId
    });
    return response.data;
  }

  async purchaseReservedCard(gameId: string, playerId: string, cardId: string, payment?: Partial<TokenBank>): Promise<Game> {
    const currentGame = await this.getGame(gameId);
    this.gameEngine.purchaseReservedCard(currentGame, playerId, cardId, payment);
    const response = await axios.post(`${this.baseURL}/${gameId}/actions/purchase-reserved-card`, {
      playerId,
      cardId,
      payment
    });
    return response.data;
  }

  async endGame(gameId: string, playerId: string): Promise<Game> {
    const response = await axios.post(`${this.baseURL}/${gameId}/end`, {
      playerId
    });
    return response.data;
  }

  async startGame(gameId: string): Promise<{ gameId: string }> {
    const response = await axios.post(`${this.baseURL}/${gameId}/start`);
    return response.data;
  }
}

export const gameService = new GameService();
