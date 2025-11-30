export enum BetStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  CANCELLED = 'cancelled'
}

export interface Bet {
  id: string;
  game_id: string;
  user_id: string;
  player_id: string;
  amount: number;
  odds: number;
  status: BetStatus;
  payout?: number;
  created_at: Date;
  settled_at?: Date;
}

export interface PlaceBetRequest {
  gameId: string;
  playerId: string;
  amount: number;
}

export interface BetResponse {
  bet: Bet;
  newBalance: number;
}

export interface GameBettingStats {
  gameId: string;
  totalBets: number;
  totalAmount: number;
  playerBets: {
    playerId: string;
    playerName: string;
    totalBets: number;
    totalAmount: number;
    odds: number;
  }[];
}

export interface UserBettingHistory {
  userId: string;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  winRate: number;
  bets: Bet[];
}
