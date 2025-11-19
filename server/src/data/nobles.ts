import { Noble } from '../domain/Noble';
import { GemType } from '../domain/types';

/**
 * Noble data for the Splendor game
 */
export const NOBLE_DATA: Noble[] = [
  new Noble('noble_1', 'Catherine de\' Medici', 3, {
    diamond: 3,
    sapphire: 3,
    emerald: 3
  }),
  new Noble('noble_2', 'Elisabeth of Austria', 3, {
    sapphire: 3,
    emerald: 3,
    ruby: 3
  }),
  new Noble('noble_3', 'Isabella I of Castile', 3, {
    emerald: 3,
    ruby: 3,
    onyx: 3
  }),
  new Noble('noble_4', 'Niccolò Machiavelli', 3, {
    ruby: 3,
    onyx: 3,
    diamond: 3
  }),
  new Noble('noble_5', 'Suleiman the Magnificent', 3, {
    onyx: 3,
    diamond: 3,
    sapphire: 3
  }),
  new Noble('noble_6', 'Anne of Brittany', 3, {
    diamond: 4,
    onyx: 4
  }),
  new Noble('noble_7', 'Charles V', 3, {
    sapphire: 4,
    diamond: 4
  }),
  new Noble('noble_8', 'Francis I of France', 3, {
    emerald: 4,
    sapphire: 4
  }),
  new Noble('noble_9', 'Henry VIII', 3, {
    ruby: 4,
    emerald: 4
  }),
  new Noble('noble_10', 'Mary Stuart', 3, {
    onyx: 4,
    ruby: 4
  }),
];
