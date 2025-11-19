import { Card, GemType } from '../types/game';

export const cardData: Card[] = [
  // ===== TIER 1 CARDS (40 cards total) =====
  // Diamond cards (8 cards)
  {
    id: 'card_1_1',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.DIAMOND,
    cost: { onyx: 3 }
  },
  {
    id: 'card_1_2',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.DIAMOND,
    cost: { onyx: 2, ruby: 1 }
  },
  {
    id: 'card_1_3',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.DIAMOND,
    cost: { emerald: 1, sapphire: 1, onyx: 1 }
  },
  {
    id: 'card_1_4',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.DIAMOND,
    cost: { emerald: 1, sapphire: 2, ruby: 1, onyx: 1 }
  },
  {
    id: 'card_1_5',
    tier: 1,
    prestige: 1,
    gemBonus: GemType.DIAMOND,
    cost: { sapphire: 4 }
  },
  {
    id: 'card_1_6',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.DIAMOND,
    cost: { ruby: 2, sapphire: 1 }
  },
  {
    id: 'card_1_7',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.DIAMOND,
    cost: { emerald: 2, onyx: 2 }
  },
  {
    id: 'card_1_8',
    tier: 1,
    prestige: 1,
    gemBonus: GemType.DIAMOND,
    cost: { emerald: 3, sapphire: 1, onyx: 1 }
  },

  // Sapphire cards (8 cards)
  {
    id: 'card_1_9',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.SAPPHIRE,
    cost: { emerald: 3 }
  },
  {
    id: 'card_1_10',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.SAPPHIRE,
    cost: { emerald: 2, ruby: 1 }
  },
  {
    id: 'card_1_11',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 1, emerald: 1, ruby: 1 }
  },
  {
    id: 'card_1_12',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 1, emerald: 2, ruby: 1, onyx: 1 }
  },
  {
    id: 'card_1_13',
    tier: 1,
    prestige: 1,
    gemBonus: GemType.SAPPHIRE,
    cost: { ruby: 4 }
  },
  {
    id: 'card_1_14',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 2, emerald: 1 }
  },
  {
    id: 'card_1_15',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 2, onyx: 2 }
  },
  {
    id: 'card_1_16',
    tier: 1,
    prestige: 1,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 3, emerald: 1, ruby: 1 }
  },

  // Emerald cards (8 cards)
  {
    id: 'card_1_17',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.EMERALD,
    cost: { sapphire: 3 }
  },
  {
    id: 'card_1_18',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.EMERALD,
    cost: { sapphire: 2, onyx: 1 }
  },
  {
    id: 'card_1_19',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 1, sapphire: 1, onyx: 1 }
  },
  {
    id: 'card_1_20',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 1, sapphire: 1, ruby: 2, onyx: 1 }
  },
  {
    id: 'card_1_21',
    tier: 1,
    prestige: 1,
    gemBonus: GemType.EMERALD,
    cost: { onyx: 4 }
  },
  {
    id: 'card_1_22',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 2, sapphire: 1 }
  },
  {
    id: 'card_1_23',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 2, ruby: 2 }
  },
  {
    id: 'card_1_24',
    tier: 1,
    prestige: 1,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 1, sapphire: 3, onyx: 1 }
  },

  // Ruby cards (8 cards)
  {
    id: 'card_1_25',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.RUBY,
    cost: { diamond: 3 }
  },
  {
    id: 'card_1_26',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.RUBY,
    cost: { diamond: 2, emerald: 1 }
  },
  {
    id: 'card_1_27',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.RUBY,
    cost: { diamond: 1, sapphire: 1, emerald: 1 }
  },
  {
    id: 'card_1_28',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.RUBY,
    cost: { diamond: 1, sapphire: 1, emerald: 2, onyx: 1 }
  },
  {
    id: 'card_1_29',
    tier: 1,
    prestige: 1,
    gemBonus: GemType.RUBY,
    cost: { emerald: 4 }
  },
  {
    id: 'card_1_30',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.RUBY,
    cost: { sapphire: 2, emerald: 1 }
  },
  {
    id: 'card_1_31',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.RUBY,
    cost: { sapphire: 2, onyx: 2 }
  },
  {
    id: 'card_1_32',
    tier: 1,
    prestige: 1,
    gemBonus: GemType.RUBY,
    cost: { sapphire: 1, emerald: 3, onyx: 1 }
  },

  // Onyx cards (8 cards)
  {
    id: 'card_1_33',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.ONYX,
    cost: { ruby: 3 }
  },
  {
    id: 'card_1_34',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.ONYX,
    cost: { ruby: 2, diamond: 1 }
  },
  {
    id: 'card_1_35',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.ONYX,
    cost: { diamond: 1, sapphire: 1, ruby: 1 }
  },
  {
    id: 'card_1_36',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.ONYX,
    cost: { diamond: 1, sapphire: 2, emerald: 1, ruby: 1 }
  },
  {
    id: 'card_1_37',
    tier: 1,
    prestige: 1,
    gemBonus: GemType.ONYX,
    cost: { diamond: 4 }
  },
  {
    id: 'card_1_38',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.ONYX,
    cost: { sapphire: 2, ruby: 1 }
  },
  {
    id: 'card_1_39',
    tier: 1,
    prestige: 0,
    gemBonus: GemType.ONYX,
    cost: { emerald: 2, ruby: 2 }
  },
  {
    id: 'card_1_40',
    tier: 1,
    prestige: 1,
    gemBonus: GemType.ONYX,
    cost: { sapphire: 3, emerald: 1, ruby: 1 }
  },

  // ===== TIER 2 CARDS (30 cards total) =====
  // Diamond cards (6 cards)
  {
    id: 'card_2_1',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.DIAMOND,
    cost: { emerald: 3, sapphire: 2, onyx: 2 }
  },
  {
    id: 'card_2_2',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.DIAMOND,
    cost: { emerald: 2, ruby: 3, onyx: 3 }
  },
  {
    id: 'card_2_3',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.DIAMOND,
    cost: { ruby: 5 }
  },
  {
    id: 'card_2_4',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.DIAMOND,
    cost: { emerald: 1, ruby: 4, onyx: 2 }
  },
  {
    id: 'card_2_5',
    tier: 2,
    prestige: 3,
    gemBonus: GemType.DIAMOND,
    cost: { onyx: 6 }
  },
  {
    id: 'card_2_6',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.DIAMOND,
    cost: { sapphire: 3, emerald: 2, ruby: 2 }
  },

  // Sapphire cards (6 cards)
  {
    id: 'card_2_7',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 2, emerald: 1, ruby: 4 }
  },
  {
    id: 'card_2_8',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 3, emerald: 2, onyx: 3 }
  },
  {
    id: 'card_2_9',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.SAPPHIRE,
    cost: { onyx: 5 }
  },
  {
    id: 'card_2_10',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 2, emerald: 1, onyx: 4 }
  },
  {
    id: 'card_2_11',
    tier: 2,
    prestige: 3,
    gemBonus: GemType.SAPPHIRE,
    cost: { emerald: 6 }
  },
  {
    id: 'card_2_12',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 2, emerald: 3, ruby: 2 }
  },

  // Emerald cards (6 cards)
  {
    id: 'card_2_13',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 4, sapphire: 2, ruby: 1 }
  },
  {
    id: 'card_2_14',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 3, sapphire: 3, onyx: 2 }
  },
  {
    id: 'card_2_15',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 5 }
  },
  {
    id: 'card_2_16',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 4, sapphire: 1, onyx: 2 }
  },
  {
    id: 'card_2_17',
    tier: 2,
    prestige: 3,
    gemBonus: GemType.EMERALD,
    cost: { ruby: 6 }
  },
  {
    id: 'card_2_18',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 2, sapphire: 3, ruby: 3 }
  },

  // Ruby cards (6 cards)
  {
    id: 'card_2_19',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.RUBY,
    cost: { diamond: 1, sapphire: 4, emerald: 2 }
  },
  {
    id: 'card_2_20',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.RUBY,
    cost: { diamond: 2, sapphire: 3, emerald: 3 }
  },
  {
    id: 'card_2_21',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.RUBY,
    cost: { sapphire: 5 }
  },
  {
    id: 'card_2_22',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.RUBY,
    cost: { sapphire: 4, emerald: 1, onyx: 2 }
  },
  {
    id: 'card_2_23',
    tier: 2,
    prestige: 3,
    gemBonus: GemType.RUBY,
    cost: { diamond: 6 }
  },
  {
    id: 'card_2_24',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.RUBY,
    cost: { emerald: 5, onyx: 3 }
  },

  // Onyx cards (6 cards)
  {
    id: 'card_2_25',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.ONYX,
    cost: { diamond: 2, sapphire: 1, emerald: 4 }
  },
  {
    id: 'card_2_26',
    tier: 2,
    prestige: 1,
    gemBonus: GemType.ONYX,
    cost: { diamond: 3, sapphire: 2, ruby: 3 }
  },
  {
    id: 'card_2_27',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.ONYX,
    cost: { emerald: 5 }
  },
  {
    id: 'card_2_28',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.ONYX,
    cost: { diamond: 2, sapphire: 1, emerald: 4 }
  },
  {
    id: 'card_2_29',
    tier: 2,
    prestige: 3,
    gemBonus: GemType.ONYX,
    cost: { sapphire: 6 }
  },
  {
    id: 'card_2_30',
    tier: 2,
    prestige: 2,
    gemBonus: GemType.ONYX,
    cost: { diamond: 3, ruby: 3, emerald: 2 }
  },

  // ===== TIER 3 CARDS (20 cards total) =====
  // Diamond cards (4 cards)
  {
    id: 'card_3_1',
    tier: 3,
    prestige: 3,
    gemBonus: GemType.DIAMOND,
    cost: { emerald: 3, sapphire: 3, ruby: 5, onyx: 3 }
  },
  {
    id: 'card_3_2',
    tier: 3,
    prestige: 4,
    gemBonus: GemType.DIAMOND,
    cost: { ruby: 7 }
  },
  {
    id: 'card_3_3',
    tier: 3,
    prestige: 4,
    gemBonus: GemType.DIAMOND,
    cost: { emerald: 3, ruby: 6, onyx: 3 }
  },
  {
    id: 'card_3_4',
    tier: 3,
    prestige: 5,
    gemBonus: GemType.DIAMOND,
    cost: { ruby: 7, onyx: 3 }
  },

  // Sapphire cards (4 cards)
  {
    id: 'card_3_5',
    tier: 3,
    prestige: 4,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 3, emerald: 6, ruby: 3 }
  },
  {
    id: 'card_3_6',
    tier: 3,
    prestige: 4,
    gemBonus: GemType.SAPPHIRE,
    cost: { onyx: 7 }
  },
  {
    id: 'card_3_7',
    tier: 3,
    prestige: 5,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 3, onyx: 7 }
  },
  {
    id: 'card_3_8',
    tier: 3,
    prestige: 3,
    gemBonus: GemType.SAPPHIRE,
    cost: { diamond: 3, emerald: 3, ruby: 3, onyx: 5 }
  },

  // Emerald cards (4 cards)
  {
    id: 'card_3_9',
    tier: 3,
    prestige: 4,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 7 }
  },
  {
    id: 'card_3_10',
    tier: 3,
    prestige: 4,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 6, sapphire: 3, onyx: 3 }
  },
  {
    id: 'card_3_11',
    tier: 3,
    prestige: 5,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 7, sapphire: 3 }
  },
  {
    id: 'card_3_12',
    tier: 3,
    prestige: 3,
    gemBonus: GemType.EMERALD,
    cost: { diamond: 5, sapphire: 3, ruby: 3, onyx: 3 }
  },

  // Ruby cards (4 cards)
  {
    id: 'card_3_13',
    tier: 3,
    prestige: 5,
    gemBonus: GemType.RUBY,
    cost: { diamond: 3, sapphire: 7 }
  },
  {
    id: 'card_3_14',
    tier: 3,
    prestige: 4,
    gemBonus: GemType.RUBY,
    cost: { sapphire: 7 }
  },
  {
    id: 'card_3_15',
    tier: 3,
    prestige: 4,
    gemBonus: GemType.RUBY,
    cost: { diamond: 3, sapphire: 6, emerald: 3 }
  },
  {
    id: 'card_3_16',
    tier: 3,
    prestige: 3,
    gemBonus: GemType.RUBY,
    cost: { diamond: 3, sapphire: 5, emerald: 3, onyx: 3 }
  },

  // Onyx cards (4 cards)
  {
    id: 'card_3_17',
    tier: 3,
    prestige: 5,
    gemBonus: GemType.ONYX,
    cost: { emerald: 7, sapphire: 3 }
  },
  {
    id: 'card_3_18',
    tier: 3,
    prestige: 4,
    gemBonus: GemType.ONYX,
    cost: { emerald: 7 }
  },
  {
    id: 'card_3_19',
    tier: 3,
    prestige: 4,
    gemBonus: GemType.ONYX,
    cost: { diamond: 3, emerald: 6, sapphire: 3 }
  },
  {
    id: 'card_3_20',
    tier: 3,
    prestige: 3,
    gemBonus: GemType.ONYX,
    cost: { diamond: 5, sapphire: 3, emerald: 3, ruby: 3 }
  }
];

// Total: 90 cards (40 Tier 1, 30 Tier 2, 20 Tier 3) - Official Splendor card count
