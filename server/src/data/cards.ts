import { Card } from '../domain/Card';
import { GemType } from '../domain/types';

export const CARD_DATA: Card[] = [
  // ===== TIER 1 CARDS (40 cards total) =====
  // Diamond cards (8 cards)
  new Card('card_1_1', 1, 0, GemType.DIAMOND, { onyx: 3 }),
  new Card('card_1_2', 1, 0, GemType.DIAMOND, { onyx: 2, ruby: 1 }),
  new Card('card_1_3', 1, 0, GemType.DIAMOND, { emerald: 1, sapphire: 1, onyx: 1 }),
  new Card('card_1_4', 1, 0, GemType.DIAMOND, { emerald: 1, sapphire: 2, ruby: 1, onyx: 1 }),
  new Card('card_1_5', 1, 1, GemType.DIAMOND, { sapphire: 4 }),
  new Card('card_1_6', 1, 0, GemType.DIAMOND, { ruby: 2, sapphire: 1 }),
  new Card('card_1_7', 1, 0, GemType.DIAMOND, { emerald: 2, onyx: 2 }),
  new Card('card_1_8', 1, 1, GemType.DIAMOND, { emerald: 3, sapphire: 1, onyx: 1 }),

  // Sapphire cards (8 cards)
  new Card('card_1_9', 1, 0, GemType.SAPPHIRE, { emerald: 3 }),
  new Card('card_1_10', 1, 0, GemType.SAPPHIRE, { emerald: 2, ruby: 1 }),
  new Card('card_1_11', 1, 0, GemType.SAPPHIRE, { diamond: 1, emerald: 1, ruby: 1 }),
  new Card('card_1_12', 1, 0, GemType.SAPPHIRE, { diamond: 1, emerald: 2, ruby: 1, onyx: 1 }),
  new Card('card_1_13', 1, 1, GemType.SAPPHIRE, { ruby: 4 }),
  new Card('card_1_14', 1, 0, GemType.SAPPHIRE, { diamond: 2, emerald: 1 }),
  new Card('card_1_15', 1, 0, GemType.SAPPHIRE, { diamond: 2, onyx: 2 }),
  new Card('card_1_16', 1, 1, GemType.SAPPHIRE, { diamond: 3, emerald: 1, ruby: 1 }),

  // Emerald cards (8 cards)
  new Card('card_1_17', 1, 0, GemType.EMERALD, { sapphire: 3 }),
  new Card('card_1_18', 1, 0, GemType.EMERALD, { sapphire: 2, onyx: 1 }),
  new Card('card_1_19', 1, 0, GemType.EMERALD, { diamond: 1, sapphire: 1, onyx: 1 }),
  new Card('card_1_20', 1, 0, GemType.EMERALD, { diamond: 1, sapphire: 1, ruby: 2, onyx: 1 }),
  new Card('card_1_21', 1, 1, GemType.EMERALD, { onyx: 4 }),
  new Card('card_1_22', 1, 0, GemType.EMERALD, { diamond: 2, sapphire: 1 }),
  new Card('card_1_23', 1, 0, GemType.EMERALD, { diamond: 2, ruby: 2 }),
  new Card('card_1_24', 1, 1, GemType.EMERALD, { diamond: 1, sapphire: 3, onyx: 1 }),

  // Ruby cards (8 cards)
  new Card('card_1_25', 1, 0, GemType.RUBY, { diamond: 3 }),
  new Card('card_1_26', 1, 0, GemType.RUBY, { diamond: 2, emerald: 1 }),
  new Card('card_1_27', 1, 0, GemType.RUBY, { diamond: 1, sapphire: 1, emerald: 1 }),
  new Card('card_1_28', 1, 0, GemType.RUBY, { diamond: 1, sapphire: 1, emerald: 2, onyx: 1 }),
  new Card('card_1_29', 1, 1, GemType.RUBY, { emerald: 4 }),
  new Card('card_1_30', 1, 0, GemType.RUBY, { sapphire: 2, emerald: 1 }),
  new Card('card_1_31', 1, 0, GemType.RUBY, { sapphire: 2, onyx: 2 }),
  new Card('card_1_32', 1, 1, GemType.RUBY, { sapphire: 1, emerald: 3, onyx: 1 }),

  // Onyx cards (8 cards)
  new Card('card_1_33', 1, 0, GemType.ONYX, { ruby: 3 }),
  new Card('card_1_34', 1, 0, GemType.ONYX, { ruby: 2, diamond: 1 }),
  new Card('card_1_35', 1, 0, GemType.ONYX, { diamond: 1, sapphire: 1, ruby: 1 }),
  new Card('card_1_36', 1, 0, GemType.ONYX, { diamond: 1, sapphire: 2, emerald: 1, ruby: 1 }),
  new Card('card_1_37', 1, 1, GemType.ONYX, { diamond: 4 }),
  new Card('card_1_38', 1, 0, GemType.ONYX, { sapphire: 2, ruby: 1 }),
  new Card('card_1_39', 1, 0, GemType.ONYX, { emerald: 2, ruby: 2 }),
  new Card('card_1_40', 1, 1, GemType.ONYX, { sapphire: 3, emerald: 1, ruby: 1 }),

  // ===== TIER 2 CARDS (30 cards total) =====
  // Diamond cards (6 cards)
  new Card('card_2_1', 2, 1, GemType.DIAMOND, { emerald: 3, sapphire: 2, onyx: 2 }),
  new Card('card_2_2', 2, 1, GemType.DIAMOND, { emerald: 2, ruby: 3, onyx: 3 }),
  new Card('card_2_3', 2, 2, GemType.DIAMOND, { ruby: 5 }),
  new Card('card_2_4', 2, 2, GemType.DIAMOND, { emerald: 1, ruby: 4, onyx: 2 }),
  new Card('card_2_5', 2, 3, GemType.DIAMOND, { onyx: 6 }),
  new Card('card_2_6', 2, 1, GemType.DIAMOND, { sapphire: 3, emerald: 2, ruby: 2 }),

  // Sapphire cards (6 cards)
  new Card('card_2_7', 2, 1, GemType.SAPPHIRE, { diamond: 2, emerald: 1, ruby: 4 }),
  new Card('card_2_8', 2, 1, GemType.SAPPHIRE, { diamond: 3, emerald: 2, onyx: 3 }),
  new Card('card_2_9', 2, 2, GemType.SAPPHIRE, { onyx: 5 }),
  new Card('card_2_10', 2, 2, GemType.SAPPHIRE, { diamond: 2, emerald: 1, onyx: 4 }),
  new Card('card_2_11', 2, 3, GemType.SAPPHIRE, { emerald: 6 }),
  new Card('card_2_12', 2, 1, GemType.SAPPHIRE, { diamond: 2, emerald: 3, ruby: 2 }),

  // Emerald cards (6 cards)
  new Card('card_2_13', 2, 1, GemType.EMERALD, { diamond: 4, sapphire: 2, ruby: 1 }),
  new Card('card_2_14', 2, 1, GemType.EMERALD, { diamond: 3, sapphire: 3, onyx: 2 }),
  new Card('card_2_15', 2, 2, GemType.EMERALD, { diamond: 5 }),
  new Card('card_2_16', 2, 2, GemType.EMERALD, { diamond: 4, sapphire: 1, onyx: 2 }),
  new Card('card_2_17', 2, 3, GemType.EMERALD, { ruby: 6 }),
  new Card('card_2_18', 2, 2, GemType.EMERALD, { diamond: 2, sapphire: 3, ruby: 3 }),

  // Ruby cards (6 cards)
  new Card('card_2_19', 2, 1, GemType.RUBY, { diamond: 1, sapphire: 4, emerald: 2 }),
  new Card('card_2_20', 2, 1, GemType.RUBY, { diamond: 2, sapphire: 3, emerald: 3 }),
  new Card('card_2_21', 2, 2, GemType.RUBY, { sapphire: 5 }),
  new Card('card_2_22', 2, 2, GemType.RUBY, { sapphire: 4, emerald: 1, onyx: 2 }),
  new Card('card_2_23', 2, 3, GemType.RUBY, { diamond: 6 }),
  new Card('card_2_24', 2, 2, GemType.RUBY, { emerald: 5, onyx: 3 }),

  // Onyx cards (6 cards)
  new Card('card_2_25', 2, 1, GemType.ONYX, { diamond: 2, sapphire: 1, emerald: 4 }),
  new Card('card_2_26', 2, 1, GemType.ONYX, { diamond: 3, sapphire: 2, ruby: 3 }),
  new Card('card_2_27', 2, 2, GemType.ONYX, { emerald: 5 }),
  new Card('card_2_28', 2, 2, GemType.ONYX, { diamond: 2, sapphire: 1, emerald: 4 }),
  new Card('card_2_29', 2, 3, GemType.ONYX, { sapphire: 6 }),
  new Card('card_2_30', 2, 2, GemType.ONYX, { diamond: 3, ruby: 3, emerald: 2 }),

  // ===== TIER 3 CARDS (20 cards total) =====
  // Diamond cards (4 cards)
  new Card('card_3_1', 3, 3, GemType.DIAMOND, { emerald: 3, sapphire: 3, ruby: 5, onyx: 3 }),
  new Card('card_3_2', 3, 4, GemType.DIAMOND, { ruby: 7 }),
  new Card('card_3_3', 3, 4, GemType.DIAMOND, { emerald: 3, ruby: 6, onyx: 3 }),
  new Card('card_3_4', 3, 5, GemType.DIAMOND, { ruby: 7, onyx: 3 }),

  // Sapphire cards (4 cards)
  new Card('card_3_5', 3, 4, GemType.SAPPHIRE, { diamond: 3, emerald: 6, ruby: 3 }),
  new Card('card_3_6', 3, 4, GemType.SAPPHIRE, { onyx: 7 }),
  new Card('card_3_7', 3, 5, GemType.SAPPHIRE, { diamond: 3, onyx: 7 }),
  new Card('card_3_8', 3, 3, GemType.SAPPHIRE, { diamond: 3, emerald: 3, ruby: 3, onyx: 5 }),

  // Emerald cards (4 cards)
  new Card('card_3_9', 3, 4, GemType.EMERALD, { diamond: 7 }),
  new Card('card_3_10', 3, 4, GemType.EMERALD, { diamond: 6, sapphire: 3, onyx: 3 }),
  new Card('card_3_11', 3, 5, GemType.EMERALD, { diamond: 7, sapphire: 3 }),
  new Card('card_3_12', 3, 3, GemType.EMERALD, { diamond: 5, sapphire: 3, ruby: 3, onyx: 3 }),

  // Ruby cards (4 cards)
  new Card('card_3_13', 3, 5, GemType.RUBY, { diamond: 3, sapphire: 7 }),
  new Card('card_3_14', 3, 4, GemType.RUBY, { sapphire: 7 }),
  new Card('card_3_15', 3, 4, GemType.RUBY, { diamond: 3, sapphire: 6, emerald: 3 }),
  new Card('card_3_16', 3, 3, GemType.RUBY, { diamond: 3, sapphire: 5, emerald: 3, onyx: 3 }),

  // Onyx cards (4 cards)
  new Card('card_3_17', 3, 5, GemType.ONYX, { emerald: 7, sapphire: 3 }),
  new Card('card_3_18', 3, 4, GemType.ONYX, { emerald: 7 }),
  new Card('card_3_19', 3, 4, GemType.ONYX, { diamond: 3, emerald: 6, sapphire: 3 }),
  new Card('card_3_20', 3, 3, GemType.ONYX, { diamond: 5, sapphire: 3, emerald: 3, ruby: 3 }),
];

// Total: 90 cards (40 Tier 1, 30 Tier 2, 20 Tier 3) - Official Splendor card count
