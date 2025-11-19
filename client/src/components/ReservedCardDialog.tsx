import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider
} from '@mui/material';
import { Card } from '../../../shared/types/game';
import { colors, borderRadius } from '../theme';
import DevCard from './DevCard';
import { GemType } from '../../../shared/types/game';

interface ReservedCardDialogProps {
  open: boolean;
  card: Card | null;
  onClose: () => void;
  onPurchase: (cardId: string) => void;
  canPurchase?: boolean;
}

// Helper function to convert Card cost to DevCard cost format
const convertCostToPips = (cost: Partial<{
  diamond: number;
  sapphire: number;
  emerald: number;
  ruby: number;
  onyx: number;
  gold: number;
}>) => {
  const pips: {gem: GemType; n: number}[] = [];

  const gemMapping: Record<string, GemType> = {
    diamond: GemType.DIAMOND,
    sapphire: GemType.SAPPHIRE,
    emerald: GemType.EMERALD,
    ruby: GemType.RUBY,
    onyx: GemType.ONYX,
    gold: GemType.GOLD
  };

  Object.entries(cost).forEach(([gemKey, count]) => {
    if (count && count > 0) {
      const gemType = gemMapping[gemKey];
      if (gemType) {
        pips.push({ gem: gemType, n: count });
      }
    }
  });

  return pips;
};

const getCardArtUrl = (card: Card): string => {
  const gemName = card.gemBonus.toLowerCase();
  return `/card-art/${gemName}-tier${card.tier}.png`;
};

const ReservedCardDialog: React.FC<ReservedCardDialogProps> = ({
  open,
  card,
  onClose,
  onPurchase,
  canPurchase = true
}) => {
  if (!card) return null;

  const costs = convertCostToPips(card.cost);
  const artUrl = getCardArtUrl(card);

  const handlePurchase = () => {
    onPurchase(card.id);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: `linear-gradient(135deg, ${colors.background.parchment} 0%, ${colors.background.card} 100%)`,
          border: `2px solid ${colors.divider}`,
          borderRadius: `${borderRadius.xl}px`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: '"Cinzel", serif',
          fontWeight: 700,
          color: colors.text.primary,
          textAlign: 'center',
          fontSize: '1.5rem',
          pb: 2
        }}
      >
        Purchase Reserved Card
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        {/* Card Preview */}
        <Box sx={{ transform: 'scale(0.8)', transformOrigin: 'center' }}>
          <DevCard
            value={card.prestige}
            artUrl={artUrl}
            costs={costs}
            bonusGem={card.gemBonus}
          />
        </Box>

        <Divider sx={{ width: '100%', bgcolor: colors.divider }} />

        {/* Action Description */}
        <Typography
          variant="body1"
          align="center"
          sx={{
            color: colors.text.secondary,
            fontWeight: 500,
            lineHeight: 1.6
          }}
        >
          Would you like to purchase this reserved card?
        </Typography>

        {/* Purchase Info */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color={colors.text.secondary}>
            <strong>Purchase:</strong> Buy this card using your tokens and bonus gems
          </Typography>
          {!canPurchase && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              You don't have enough resources to purchase this card
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            fontFamily: '"Cinzel", serif',
            fontWeight: 600,
            borderColor: colors.divider,
            color: colors.text.secondary,
            '&:hover': {
              borderColor: colors.text.primary,
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          Cancel
        </Button>

        <Button
          onClick={handlePurchase}
          variant="contained"
          disabled={!canPurchase}
          sx={{
            fontFamily: '"Cinzel", serif',
            fontWeight: 600,
            backgroundColor: colors.primary.main,
            '&:hover': {
              backgroundColor: colors.primary.dark
            },
            '&:disabled': {
              backgroundColor: colors.divider,
              color: colors.text.secondary
            }
          }}
        >
          Purchase
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReservedCardDialog;
