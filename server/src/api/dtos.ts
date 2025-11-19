/**
 * Data Transfer Objects (DTOs) for API communication.
 * These are the JSON structures sent between client and server.
 */

export interface TokenBankDTO {
  diamond: number;
  sapphire: number;
  emerald: number;
  ruby: number;
  onyx: number;
  gold: number;
}

export interface CardDTO {
  id: string;
  tier: 1 | 2 | 3;
  prestige: number;
  gemBonus: string;
  cost: Partial<TokenBankDTO>;
}

export interface NobleDTO {
  id: string;
  name: string;
  prestige: number;
  requirements: Partial<TokenBankDTO>;
}

export interface PlayerDTO {
  id: string;
  name: string;
  userId?: string;
  tokens: TokenBankDTO;
  cards: CardDTO[];
  reservedCards: CardDTO[];
  nobles: NobleDTO[];
  prestige: number;
}

export interface GameStateDTO {
  id: string;
  name: string;
  players: PlayerDTO[];
  currentPlayerIndex: number;
  state: 'waiting_for_players' | 'in_progress' | 'finished';
  board: {
    availableCards: {
      tier1: CardDTO[];
      tier2: CardDTO[];
      tier3: CardDTO[];
    };
    cardDecks: {
      tier1: number; // Just the count
      tier2: number;
      tier3: number;
    };
    nobles: NobleDTO[];
    tokens: TokenBankDTO;
  };
  isPrivate: boolean;
  inviteCode?: string;
  createdBy: string;
  winner?: PlayerDTO;
  endReason?: 'victory' | 'terminated';
  endedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Request DTOs
export interface CreateGameRequestDTO {
  playerName: string;
  lobbyName: string;
  isPrivate?: boolean;
}

export interface JoinGameRequestDTO {
  playerName: string;
}

export interface TakeTokensRequestDTO {
  gameId: string;
  playerId: string;
  tokens: Partial<TokenBankDTO>;
}

export interface PurchaseCardRequestDTO {
  gameId: string;
  playerId: string;
  cardId: string;
  payment?: Partial<TokenBankDTO>;
}

export interface ReserveCardRequestDTO {
  gameId: string;
  playerId: string;
  cardId: string;
}

export interface PurchaseReservedCardRequestDTO {
  gameId: string;
  playerId: string;
  cardId: string;
  payment?: Partial<TokenBankDTO>;
}

// Response DTOs
export interface CreateGameResponseDTO {
  game: GameStateDTO;
  playerId: string;
}

export interface JoinGameResponseDTO {
  game: GameStateDTO;
  playerId: string;
}
