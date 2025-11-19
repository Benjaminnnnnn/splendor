import { Noble } from '../types/game';

/**
 * Noble data for the Splendor game
 *
 * Noble artwork integration:
 * - Place noble artwork files in client/public/noble-art/
 * - Name files as noble_X.png (where X is the noble number)
 * - Update the artMapping in NobleComponent.tsx to include new files
 * - Current artwork available: noble_1.png
 */
export const nobleData: Noble[] = [
  {
    id: 'noble_1',
    name: 'Catherine de\' Medici',
    prestige: 3,
    requirements: {
      diamond: 3,
      sapphire: 3,
      emerald: 3
    }
  },
  {
    id: 'noble_2',
    name: 'Elisabeth of Austria',
    prestige: 3,
    requirements: {
      sapphire: 3,
      emerald: 3,
      ruby: 3
    }
  },
  {
    id: 'noble_3',
    name: 'Isabella I of Castile',
    prestige: 3,
    requirements: {
      emerald: 3,
      ruby: 3,
      onyx: 3
    }
  },
  {
    id: 'noble_4',
    name: 'Niccolò Machiavelli',
    prestige: 3,
    requirements: {
      ruby: 3,
      onyx: 3,
      diamond: 3
    }
  },
  {
    id: 'noble_5',
    name: 'Suleiman the Magnificent',
    prestige: 3,
    requirements: {
      onyx: 3,
      diamond: 3,
      sapphire: 3
    }
  },
  {
    id: 'noble_6',
    name: 'Anne of Brittany',
    prestige: 3,
    requirements: {
      diamond: 4,
      onyx: 4
    }
  },
  {
    id: 'noble_7',
    name: 'Charles V',
    prestige: 3,
    requirements: {
      sapphire: 4,
      diamond: 4
    }
  },
  {
    id: 'noble_8',
    name: 'Francis I of France',
    prestige: 3,
    requirements: {
      emerald: 4,
      sapphire: 4
    }
  },
  {
    id: 'noble_9',
    name: 'Henry VIII',
    prestige: 3,
    requirements: {
      ruby: 4,
      emerald: 4
    }
  },
  {
    id: 'noble_10',
    name: 'Mary Stuart',
    prestige: 3,
    requirements: {
      onyx: 4,
      ruby: 4
    }
  }
];
