import React from 'react';
import { Box, Typography } from '@mui/material';
import { Card, GemType } from '../../../shared/types/game';
import { gemColors } from '../constants/gemColors';
import { sizes, animations } from '../theme';

interface CardComponentProps {
  card: Card;
  onPurchase?: () => void;
  isDisabled?: boolean;
  showPurchaseButton?: boolean;
}

// Helper function to get gem color
const getGemColor = (gemType: GemType): string => {
  return gemColors[gemType] || '#666';
};

const CardComponent: React.FC<CardComponentProps> = ({
  card,
  onPurchase,
  isDisabled = false,
  showPurchaseButton = true
}) => {
  const handleClick = () => {
    if (!isDisabled && onPurchase) {
      onPurchase();
    }
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        width: sizes.card.md.width,
        height: sizes.card.md.height,
        borderRadius: 3,
        position: 'relative',
        cursor: isDisabled ? 'not-allowed' : showPurchaseButton ? 'pointer' : 'default',
        transition: animations.hover,
        backgroundColor: 'white',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        '&:hover': !isDisabled && showPurchaseButton ? {
          transform: 'translateY(-2px) scale(1.01)',
          boxShadow: `0 8px 20px rgba(0, 0, 0, 0.25), 0 0 0 1px ${getGemColor(card.gemBonus)}`,
          zIndex: 10,
        } : {},
        '&:active': !isDisabled && showPurchaseButton ? {
          transform: 'translateY(-1px) scale(1.005)',
        } : {},
        opacity: isDisabled ? 0.6 : 1,
      }}
    >
      {/* Prestige Points - Top Left (like real Splendor cards) */}
      {card.prestige > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'white',
            border: '2px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}
        >
          <Typography
            sx={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              lineHeight: 1,
            }}
          >
            {card.prestige}
          </Typography>
        </Box>
      )}

      {/* Bonus Gem - Top Right (square like real cards) */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          width: 28,
          height: 28,
          borderRadius: '6px',
          backgroundColor: getGemColor(card.gemBonus),
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        }}
      />

      {/* Cost Gems - Left Side Vertical Stack (like real cards) */}
      <Box
        sx={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {Object.entries(card.cost).map(([gemType, cost]) => {
          if (!cost || cost === 0) return null;

          return (
            <Box
              key={gemType}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: getGemColor(gemType as GemType),
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                position: 'relative',
              }}
            >
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                  lineHeight: 1,
                }}
              >
                {cost}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Main Artwork Area - fills the center */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg,
            ${getGemColor(card.gemBonus)}15 0%,
            ${getGemColor(card.gemBonus)}08 30%,
            ${getGemColor(card.gemBonus)}03 60%,
            ${getGemColor(card.gemBonus)}08 100%
          )`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(circle at 70% 30%, ${getGemColor(card.gemBonus)}20 0%, transparent 50%),
              radial-gradient(circle at 30% 70%, ${getGemColor(card.gemBonus)}15 0%, transparent 60%),
              linear-gradient(45deg, transparent 40%, ${getGemColor(card.gemBonus)}05 50%, transparent 60%)
            `,
          }
        }}
      >
        {/* Subtle tier indicator in center (like artwork placeholder) */}
        <Typography
          sx={{
            fontSize: '48px',
            fontWeight: 100,
            color: `${getGemColor(card.gemBonus)}40`,
            zIndex: 1,
            userSelect: 'none',
            letterSpacing: '2px',
          }}
        >
          {card.tier}
        </Typography>
      </Box>

      {/* Decorative border frame (like real card edges) */}
      <Box
        sx={{
          position: 'absolute',
          inset: 4,
          border: `1px solid ${getGemColor(card.gemBonus)}30`,
          borderRadius: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Purchase Overlay for Interaction Feedback */}
      {showPurchaseButton && !isDisabled && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: 3,
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        />
      )}
    </Box>
  );
};

export default CardComponent;
