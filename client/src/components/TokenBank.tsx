import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { TokenBank as TokenBankType, GemType } from '../../../shared/types/game';
import { borderRadius, colors } from '../theme';
import GemChip from './GemChip';

interface TokenBankProps {
  tokens: TokenBankType;
  selectedTokens: Partial<TokenBankType>;
  onTokenSelectionChange: (tokens: Partial<TokenBankType>) => void;
}

/** Pure validator for easy testing/reuse. */
export function validateTokenSelection(
  selection: Partial<TokenBankType>,
  bank: TokenBankType
): string {
  const entries = Object.entries(selection)
    .filter(([g, c]) => g !== 'gold' && (c ?? 0) > 0) as [keyof TokenBankType, number][];

  if (entries.length === 0) return '';

  if (entries.length === 3) {
    const allOnes = entries.every(([, c]) => c === 1);
    return allOnes ? '' : 'When taking 3 gems, you can only take 1 of each type.';
  }

  if (entries.length === 1) {
    const [g, c] = entries[0];
    if (c === 2) {
      if (bank[g] < 4) return 'You can only take 2 of a color if at least 4 remain.';
      return '';
    }
    if (c === 1) return '';
    return 'Invalid selection.';
  }

  // 2 colors is never valid
  return 'You can take either 3 different gems OR 2 of the same gem (if 4+ available).';
}

const GEM_ORDER: (keyof TokenBankType)[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx', 'gold'];

const TokenBank: React.FC<TokenBankProps> = ({ tokens, selectedTokens, onTokenSelectionChange }) => {
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    setErrorMessage(validateTokenSelection(selectedTokens, tokens));
  }, [selectedTokens, tokens]);

  const toggleGem = useCallback(
    (gem: keyof TokenBankType) => {
      if (gem === 'gold') return; // cannot take directly

      const current = selectedTokens[gem] || 0;
      const available = tokens[gem];
      let next: Partial<TokenBankType>;

      if (current === 0 && available > 0) {
        next = { ...selectedTokens, [gem]: 1 };
      } else if (current === 1 && available >= 4) {
        next = { ...selectedTokens, [gem]: 2 };
      } else {
        next = { ...selectedTokens };
        delete next[gem];
      }
      onTokenSelectionChange(next);
    },
    [onTokenSelectionChange, selectedTokens, tokens]
  );

  return (
    <Box
      data-testid="token-bank"
      sx={{
        background: 'rgba(0, 0, 0, 0.4)', // Added semi-transparent background
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        p: 2,
        backdropFilter: 'blur(4px)', // Added blur for better visual separation
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography
          component="h2"
          variant="h5"
          sx={{
            fontFamily: '"Cinzel", serif',
            fontWeight: 700,
            color: '#fff',
            textAlign: 'center',
            letterSpacing: '.08em',
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
            fontSize: '1.1rem',
          }}
        >
          Tokens
        </Typography>
      </Box>

      {/* Token grid - Vertical layout */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          mb: 2,
          alignItems: 'center',
        }}
      >
        {GEM_ORDER.map((gem) => {
          const count = tokens[gem];
          const selected = selectedTokens[gem] || 0;
          const isGold = gem === 'gold';
          const disabled = count === 0 || isGold;

          return (
            <Box key={gem} sx={{ textAlign: 'center', position: 'relative' }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                {/* Low-stock pulse (≤2) */}
                {!isGold && count <= 2 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: -6,
                      borderRadius: '999px',
                      boxShadow: '0 0 0 0 rgba(234,179,8,.35)',
                      animation: 'sv-pulse 1.2s ease-in-out infinite',
                      pointerEvents: 'none',
                      '@keyframes sv-pulse': {
                        '0%': { boxShadow: '0 0 0 0 rgba(234,179,8,.35)' },
                        '100%': { boxShadow: '0 0 0 12px rgba(234,179,8,0)' },
                      },
                    }}
                  />
                )}

                <Box
                  onClick={() => !disabled && toggleGem(gem)}
                  sx={{ cursor: disabled ? 'default' : 'pointer' }}
                >
                  <GemChip
                    gem={gem as GemType}
                    count={count}
                    size="lg"
                    interactive={!isGold}
                    disabled={disabled}
                    selected={selected > 0}
                  />
                </Box>

                {/* Selection badge */}
                {selected > 0 && !isGold && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      bgcolor: colors.primary.main,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      border: '2px solid white',
                      boxShadow: '0 2px 4px rgba(0,0,0,.25)',
                      zIndex: 10,
                    }}
                  >
                    {selected}
                  </Box>
                )}
              </Box>


            </Box>
          );
        })}
      </Box>

      {/* Error message */}
      {errorMessage && (
        <Alert
          severity="error"
          sx={{
            mt: 2,
            borderRadius: `${borderRadius.lg}px`,
            '& .MuiAlert-message': { fontSize: '0.9rem' },
          }}
        >
          {errorMessage}
        </Alert>
      )}

      {/* Selection summary as chips - Vertical layout */}
      {Object.keys(selectedTokens).length > 0 && !errorMessage && (
        <Box
          sx={{
            mt: 2,
            p: 1,
            bgcolor: colors.background.parchment,
            borderRadius: `${borderRadius.lg}px`,
            border: `1px solid ${colors.secondary.light}`,
            boxShadow: '0 2px 4px rgba(44, 24, 16, .08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.75,
            flexWrap: 'wrap',
          }}
        >
          {GEM_ORDER.filter((g) => (selectedTokens[g] ?? 0) > 0).map((g) => (
            <GemChip key={g} gem={g as GemType} count={selectedTokens[g]!} size="sm" interactive={false} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TokenBank;
