# Noble Artwork

This directory contains artwork for noble tiles in the Splendor game.

## Current Artwork
- `noble_1.png` - Catherine de' Medici

## Adding New Noble Artwork

To add artwork for additional nobles:

1. **Place artwork files in this directory** with the naming convention `noble_X.png` where X is the noble number (1-10)

2. **Update the artwork mapping** in `client/src/components/NobleComponent.tsx`:
   ```typescript
   const artMapping: Record<string, string> = {
     'noble_1': '/noble-art/noble_1.png',
     'noble_2': '/noble-art/noble_2.png', // Add new entries like this
     // ... etc
   };
   ```

3. **Recommended image specifications**:
   - Format: PNG (supports transparency)
   - Dimensions: 220px width × 180px height (or proportional)
   - Style: Portrait-style artwork that fits the noble theme

## Noble List Reference

For reference, the nobles and their IDs are:
- `noble_1` - Catherine de' Medici
- `noble_2` - Elisabeth of Austria
- `noble_3` - Isabella I of Castile
- `noble_4` - Niccolò Machiavelli
- `noble_5` - Suleiman the Magnificent
- `noble_6` - Anne of Brittany
- `noble_7` - Charles V
- `noble_8` - Francis I of France
- `noble_9` - Henry VIII
- `noble_10` - Mary Stuart

## Fallback Behavior

If no artwork is available for a noble, the component will display:
- A brown gradient background with decorative elements
- A circular placeholder with the noble's first initial
- The noble's name and prestige points as usual
