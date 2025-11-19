import { TokenBank } from '../../../shared/types/game';

export function isValidTokenTake(tokens: Partial<TokenBank>, availableTokens: TokenBank): boolean {
  const gemTypes = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as const;
  const tokenCounts = gemTypes.map(gem => tokens[gem] || 0);
  const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);

  if (tokens.gold && tokens.gold > 0) {
    return false;
  }

  if (totalTokens === 3) {
    const allOnesAndDifferent = tokenCounts.every(count => count <= 1);
    const allAvailable = gemTypes.every(gem =>
      !tokens[gem] || tokens[gem]! <= availableTokens[gem]
    );
    return allOnesAndDifferent || allAvailable;
  }

  if (totalTokens === 2) {
    const selectedGem = gemTypes.find(gem => tokens[gem] === 2);
    return selectedGem !== undefined && availableTokens[selectedGem] >= 2;
  }

  return true;
}
