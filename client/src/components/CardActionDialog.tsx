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

interface CardActionDialogProps {
  open: boolean;
  card: Card | null;
  onClose: () => void;
  onPurchase: (cardId: string) => void;
  onReserve: (cardId: string) => void;
  canPurchase?: boolean;
  canReserve?: boolean;
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

const CardActionDialog: React.FC<CardActionDialogProps> = ({
  open,
  card,
  onClose,
  onPurchase,
  onReserve,
  canPurchase = true,
  canReserve = true
}) => {
  if (!card) return null;

  const costs = convertCostToPips(card.cost);
  const artUrl = getCardArtUrl(card);

  const handlePurchase = () => {
    onPurchase(card.id);
    onClose();
  };

  const handleReserve = () => {
    onReserve(card.id);
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
        Card Action
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
          What would you like to do with this card?
        </Typography>

        {/* Purchase Info */}
        {canPurchase && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color={colors.text.secondary}>
              <strong>Purchase:</strong> Buy this card using your tokens and bonus gems
            </Typography>
          </Box>
        )}

        {/* Reserve Info */}
        {canReserve && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color={colors.text.secondary}>
              <strong>Reserve:</strong> Set aside this card for later and receive a gold token
            </Typography>
          </Box>
        )}
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

        {canReserve && (
          <Button
            onClick={handleReserve}
            variant="outlined"
            sx={{
              fontFamily: '"Cinzel", serif',
              fontWeight: 600,
              borderColor: colors.secondary.main,
              color: colors.secondary.main,
              '&:hover': {
                borderColor: colors.secondary.dark,
                backgroundColor: `${colors.secondary.main}15`
              }
            }}
          >
            Reserve
          </Button>
        )}

        {canPurchase && (
          <Button
            onClick={handlePurchase}
            variant="contained"
            sx={{
              fontFamily: '"Cinzel", serif',
              fontWeight: 600,
              backgroundColor: colors.primary.main,
              '&:hover': {
                backgroundColor: colors.primary.dark
              }
            }}
          >
            Purchase
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CardActionDialog;
