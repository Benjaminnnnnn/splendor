export interface User {
  id: string;
  username: string;
  email: string;
  created_at: Date;
  last_login?: Date;
}

export interface UserStats {
  id: number;
  user_id: string;
  games_played: number;
  games_won: number;
  total_prestige_points: number;
  total_cards_purchased: number;
  total_nobles_acquired: number;
  fastest_win_time?: number;
  highest_prestige_score: number;
  favorite_gem_type?: string;
  virtual_currency: number;
  created_at: Date;
  updated_at: Date;
}

export interface GameHistory {
  id: string;
  game_data: string; // JSON serialized game state
  winner_id?: string;
  winner_username?: string;
  players: string[]; // Array of user IDs
  duration_seconds: number;
  created_at: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: Date;
}

export interface GameStatsUpdate {
  gamesPlayed: number;
  gamesWon: number;
  totalPrestigePoints: number;
  totalCardsPurchased: number;
  totalNoblesAcquired: number;
  fastestWinTime?: number;
  highestPrestigeScore: number;
  favoriteGemType?: string;
}
