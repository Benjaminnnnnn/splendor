import type { APIRequestContext, Page } from '@playwright/test';
import type { GameStateDTO } from '../../server/src/api/dtos';

export interface CustomGameState {
  players?: Array<{
    id: string;
    name?: string;
    tokens?: {
      diamond?: number;
      sapphire?: number;
      emerald?: number;
      ruby?: number;
      onyx?: number;
      gold?: number;
    };
    cards?: string[];
    reservedCards?: string[];
    nobles?: string[];
  }>;
  currentPlayerIndex?: number;
  board?: {
    tokens?: {
      diamond?: number;
      sapphire?: number;
      emerald?: number;
      ruby?: number;
      onyx?: number;
      gold?: number;
    };
    availableCards?: {
      tier1?: string[];
      tier2?: string[];
      tier3?: string[];
    };
    nobles?: string[];
  };
}

export function buildApiUrl(gameId: string, apiPort = 3001) {
  return `http://localhost:${apiPort}/api/games/${gameId}`;
}

export async function setGameState(
  api: APIRequestContext,
  apiUrl: string,
  state: CustomGameState,
  page?: Page
): Promise<GameStateDTO> {
  const response = await api.put(`${apiUrl}/state`, { data: state });

  if (!response.ok()) {
    const message = await response.text();
    throw new Error(`Failed to set game state (${response.status()}): ${message}`);
  }

  const updatedState = (await response.json()) as GameStateDTO;

  if (page) {
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');
  }

  return updatedState;
}

export async function getGameState(api: APIRequestContext, apiUrl: string): Promise<GameStateDTO> {
  const response = await api.get(apiUrl);
  if (!response.ok()) {
    const message = await response.text();
    throw new Error(`Failed to fetch game state (${response.status()}): ${message}`);
  }
  return (await response.json()) as GameStateDTO;
}
