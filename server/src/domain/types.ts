/**
 * Backend domain types for the Splendor game.
 * These are internal OO models, separate from API DTOs.
 */

export enum GemType {
  DIAMOND = 'diamond',
  SAPPHIRE = 'sapphire',
  EMERALD = 'emerald',
  RUBY = 'ruby',
  ONYX = 'onyx',
  GOLD = 'gold'
}

export enum GameStatus {
  WAITING_FOR_PLAYERS = 'waiting_for_players',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished'
}

export type GemCost = {
  [key in GemType]?: number;
};

export type TokenCount = {
  [key in GemType]: number;
};
