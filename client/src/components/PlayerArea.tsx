import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Chip } from '@mui/material';
import { Player, GemType, Card } from '../../../shared/types/game';
import { borderRadius, colors, animations } from '../theme';
import { gemColors } from '../constants/gemColors';
import ReservedCard from './ReservedCard';
import ReservedCardDialog from './ReservedCardDialog';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  onPurchaseReservedCard?: (cardId: string) => void;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isCurrentPlayer, onPurchaseReservedCard }) => {
  const [prestigeChanged, setPrestigeChanged] = useState(false);
  const [previousPrestige, setPreviousPrestige] = useState(player.prestige);
  const [selectedReservedCard, setSelectedReservedCard] = useState<Card | null>(null);
  const [reservedCardDialogOpen, setReservedCardDialogOpen] = useState(false);

  // Noble qualification "pop" animation trigger
  useEffect(() => {
    if (player.prestige > previousPrestige) {
      setPrestigeChanged(true);
      const timer = setTimeout(() => setPrestigeChanged(false), 500);
      return () => clearTimeout(timer);
    }
    setPreviousPrestige(player.prestige);
  }, [player.prestige, previousPrestige]);

  const handleReservedCardClick = (card: Card) => {
    setSelectedReservedCard(card);
    setReservedCardDialogOpen(true);
  };

  const handlePurchaseReservedCard = (cardId: string) => {
    if (onPurchaseReservedCard) {
      onPurchaseReservedCard(cardId);
    }
    setReservedCardDialogOpen(false);
    setSelectedReservedCard(null);
  };

  const handleCloseReservedCardDialog = () => {
    setReservedCardDialogOpen(false);
    setSelectedReservedCard(null);
  };

  return (
    <Paper
      elevation={0}
      data-testid={`player-area-${player.id}`}
      sx={{
        p: 2, // Reduced padding for compact view
        border: isCurrentPlayer
          ? `2px solid ${colors.secondary.light}` // Use gold for current player
          : `1px solid rgba(255, 255, 255, 0.2)`, // Light border for sidebar
        bgcolor: isCurrentPlayer
          ? 'rgba(255, 215, 0, 0.1)' // Gold tint for current player
          : 'rgba(255, 255, 255, 0.05)', // Subtle background for sidebar
        borderRadius: `${borderRadius.lg}px`,
        boxShadow: isCurrentPlayer
          ? '0 4px 12px rgba(255, 215, 0, 0.2)'
          : '0 2px 6px rgba(0, 0, 0, 0.1)',
        transition: animations.hover,
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: isCurrentPlayer
            ? '0 6px 16px rgba(255, 215, 0, 0.3)'
            : '0 4px 12px rgba(0, 0, 0, 0.15)',
        }
      }}
    >
      {/* Compact prestige display */}
      <Typography
        variant="h5"
        data-testid="player-prestige"
        sx={{
          color: colors.secondary.light,
          mb: 1.5, // Reduced from 2
          fontWeight: 600,
          transform: prestigeChanged ? 'scale(1.1)' : 'scale(1)',
          transition: animations.popup,
          fontSize: '1.1rem', // Reduced from 1.2rem
        }}
      >
        {player.prestige} Prestige Points
      </Typography>

      {/* Token row */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 1 }}>
        {(['diamond', 'sapphire', 'emerald', 'ruby', 'onyx', 'gold'] as GemType[]).map((gem) => {
          const tokens = player.tokens[gem] || 0;

          // Only show gems where the player has tokens
          if (tokens === 0) return null;

          return (
            <Box key={gem} sx={{ textAlign: 'center' }}>
              <Box
                data-testid={`player-token-${gem}`}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: `
                    radial-gradient(circle at 30% 30%,
                      ${gemColors[gem]}E6 0%,
                      ${gemColors[gem]} 60%,
                      ${gemColors[gem]}CC 100%
                    )
                  `,
                  boxShadow: `
                    inset 1px 1px 2px rgba(255, 255, 255, 0.4),
                    inset -1px -1px 2px rgba(0, 0, 0, 0.2),
                    0 2px 4px rgba(0, 0, 0, 0.15)
                  `,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: gem === 'diamond' ? '1px solid #ccc' : 'none',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: gem === 'diamond' || gem === 'gold' ? 'black' : 'white',
                    lineHeight: 1,
                    textShadow: '0 1px 1px rgba(0, 0, 0, 0.3)',
                    userSelect: 'none'
                  }}
                >
                  {tokens}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Card bonuses row */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
        {(['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as GemType[]).map((gem) => {
          const bonuses = player.cards.filter(card => card.gemBonus === gem).length;

          // Only show gems where the player has card bonuses
          if (bonuses === 0) return null;

          return (
            <Box
              key={gem}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.3,
                px: 0.5,
                py: 0.2,
                borderRadius: `${borderRadius.sm}px`,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${gemColors[gem]}`,
              }}
            >
              {/* Small gem indicator */}
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: gemColors[gem],
                  border: gem === 'diamond' ? '1px solid #ccc' : 'none',
                  flexShrink: 0,
                }}
              />

              {/* Bonus text */}
              <Typography
                sx={{
                  color: gemColors[gem],
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                +{bonuses}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Reserved Cards */}
      {player.reservedCards.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{
            mb: 1,
            color: 'white',
            fontWeight: 500,
            fontSize: '0.9rem',
          }}>
            Reserved Cards: {player.reservedCards.length}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {player.reservedCards.map((card) => (
              <ReservedCard
                key={card.id}
                card={card}
                onClick={onPurchaseReservedCard ? handleReservedCardClick : undefined}
                disabled={!onPurchaseReservedCard}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Nobles */}
      {player.nobles.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{
            mb: 1,
            color: colors.secondary.light, // Use gold color for better visibility
            fontWeight: 500,
            fontSize: '0.9rem',
          }}>
            Nobles: {player.nobles.length}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {player.nobles.map((noble) => (
              <Chip
                key={noble.id}
                size="small"
                label={`${noble.prestige} pts`}
                sx={{
                  bgcolor: colors.secondary.main,
                  color: 'black',
                  borderRadius: `${borderRadius.sm}px`,
                  fontWeight: 600,
                  height: 24,
                  fontSize: '0.75rem',
                  transition: animations.hover,
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    cursor: 'default',
                  }
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Reserved Card Purchase Dialog */}
      <ReservedCardDialog
        open={reservedCardDialogOpen}
        card={selectedReservedCard}
        onClose={handleCloseReservedCardDialog}
        onPurchase={handlePurchaseReservedCard}
        canPurchase={isCurrentPlayer} // Only allow purchase if it's the current player's turn
      />
    </Paper>
  );
};

export default PlayerArea;
