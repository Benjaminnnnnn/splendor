export enum GemType {
  DIAMOND = 'diamond',
  SAPPHIRE = 'sapphire',
  EMERALD = 'emerald',
  RUBY = 'ruby',
  ONYX = 'onyx',
  GOLD = 'gold'
}

export enum GameState {
  WAITING_FOR_PLAYERS = 'waiting_for_players',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished'
}

export interface TokenBank {
  diamond: number;
  sapphire: number;
  emerald: number;
  ruby: number;
  onyx: number;
  gold: number;
}

export interface Card {
  id: string;
  tier: 1 | 2 | 3;
  prestige: number;
  gemBonus: GemType;
  cost: Partial<TokenBank>;
}

export interface Noble {
  id: string;
  name: string;
  prestige: number;
  requirements: Partial<TokenBank>;
}

export interface Player {
  id: string;
  name: string;
  userId?: string;
  tokens: TokenBank;
  cards: Card[];
  reservedCards: Card[];
  nobles: Noble[];
  prestige: number;
}

export interface GameBoard {
  availableCards: {
    tier1: Card[];
    tier2: Card[];
    tier3: Card[];
  };
  cardDecks: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
  nobles: Noble[];
  tokens: TokenBank;
}

export interface Game {
  id: string;
  name: string; // Lobby name (mandatory)
  players: Player[];
  currentPlayerIndex: number;
  state: GameState;
  board: GameBoard;
  isPrivate: boolean;
  inviteCode?: string; // Only for private games
  createdBy: string; // Player ID or username who created the game
  winner?: Player;
  endTriggered?: boolean;
  endTriggerPlayerIndex?: number;
  endReason?: 'victory' | 'terminated';
  endedBy?: string; // Player ID who ended the game
  createdAt: Date;
  updatedAt: Date;
}

export interface GameAction {
  type: 'take_tokens' | 'purchase_card' | 'reserve_card';
  playerId: string;
  payload: any;
}
