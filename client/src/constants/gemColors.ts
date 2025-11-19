import { GemType } from '../../../shared/types/game';
import { gemSystem } from '../theme';

export const gemColors = {
  [GemType.DIAMOND]: gemSystem.diamond.color,
  [GemType.SAPPHIRE]: gemSystem.sapphire.color,
  [GemType.EMERALD]: gemSystem.emerald.color,
  [GemType.RUBY]: gemSystem.ruby.color,
  [GemType.ONYX]: gemSystem.onyx.color,
  [GemType.GOLD]: gemSystem.gold.color
};

// Gem symbols and letters for accessibility
export const getGemSymbol = (gem: GemType): string => {
  switch (gem) {
    case GemType.DIAMOND: return gemSystem.diamond.symbol;
    case GemType.SAPPHIRE: return gemSystem.sapphire.symbol;
    case GemType.EMERALD: return gemSystem.emerald.symbol;
    case GemType.RUBY: return gemSystem.ruby.symbol;
    case GemType.ONYX: return gemSystem.onyx.symbol;
    case GemType.GOLD: return gemSystem.gold.symbol;
    default: return '';
  }
};

export const getGemLetter = (gem: GemType): string => {
  switch (gem) {
    case GemType.DIAMOND: return gemSystem.diamond.letter;
    case GemType.SAPPHIRE: return gemSystem.sapphire.letter;
    case GemType.EMERALD: return gemSystem.emerald.letter;
    case GemType.RUBY: return gemSystem.ruby.letter;
    case GemType.ONYX: return gemSystem.onyx.letter;
    case GemType.GOLD: return gemSystem.gold.letter;
    default: return '';
  }
};

export const getGemContrastColor = (gem: GemType): string => {
  switch (gem) {
    case GemType.DIAMOND: return gemSystem.diamond.contrastColor;
    case GemType.SAPPHIRE: return gemSystem.sapphire.contrastColor;
    case GemType.EMERALD: return gemSystem.emerald.contrastColor;
    case GemType.RUBY: return gemSystem.ruby.contrastColor;
    case GemType.ONYX: return gemSystem.onyx.contrastColor;
    case GemType.GOLD: return gemSystem.gold.contrastColor;
    default: return '#000';
  }
};
