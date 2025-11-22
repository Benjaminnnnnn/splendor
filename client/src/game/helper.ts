import { TokenBank } from '../../../shared/types/game';

const validGems = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx', 'gold'];

function validateTokenRequest(tokens: Partial<TokenBank>): boolean {
  if (tokens === undefined) {
    return false;
  }
  if (tokens === null) {
    return false;
  }

  // Basic type/number validation
  const entries = Object.entries(tokens) as [string, any][];
  for (const [k, v] of entries) {
    if (!validGems.includes(k)) return false;
    if (v === undefined) continue;
    if (typeof v !== 'number' || Number.isNaN(v) || !Number.isInteger(v)) return false;
    if (v < 0) return false;
  }

  return true;
}

function validateAvailableTokens(tokens: TokenBank): boolean {
  if (tokens === undefined) {
    return false;
  }
  if (tokens === null) {
    return false;
  }

  // Basic type/number validation
  const entries = Object.entries(tokens) as [string, any][];
  for (const [k, v] of entries) {
    if (!validGems.includes(k)) return false;
    if (v === undefined) return false;
    if (typeof v !== 'number' || Number.isNaN(v) || !Number.isInteger(v)) return false;
    if (v < 0) return false;
  }

  return true;
}

export function isValidTokenTake(tokens: Partial<TokenBank>, availableTokens: TokenBank): boolean {
  if (tokens === undefined || availableTokens === undefined) {
    return false;
  }
  if (tokens === null || availableTokens === null) {
    return false;
  }

  if (!validateTokenRequest(tokens)) {
    return false;
  }
  if (!validateAvailableTokens(availableTokens)) {
    return false;
  }

  // Cannot take gold directly
  if (tokens.gold && Number(tokens.gold) > 0) return false;

  // Filter out gems that are not being taken
  const selectedGems = Object.entries(tokens).filter(([gem, count]) => count && count > 0);

  // Must take some gems
  if (selectedGems.length === 0) {
    return false;
  }

  // Total tokens taken never exceed 3
  const totalTaken = selectedGems.reduce((s, [, c]) => s + c, 0);
  if (totalTaken > 3) {
    return false;
  }

  // Rule 1: Take 3 different gems
  if (selectedGems.length === 3) {
    return selectedGems.every(([gem, count]) =>
      count === 1 && availableTokens[gem as keyof TokenBank] >= 1
    );
  }

  // Rule 2: Take 2 of the same gem (if 4+ available)
  if (selectedGems.length === 1) {
    const [gem, count] = selectedGems[0];
    return count === 2 && availableTokens[gem as keyof TokenBank] >= 4;
  }

  return false;
}

