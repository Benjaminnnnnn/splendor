import React from 'react';
import { Box } from '@mui/material';
import { Card, GemType } from '../../../shared/types/game';
import DevCard from './DevCard';

interface GameCardProps {
  card: Card;
  onCardSelect?: (card: Card) => void;
  isDisabled?: boolean;
  showSelectable?: boolean;
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

  // Map string keys to GemType enum values
  const gemMapping: Record<string, GemType> = {
    diamond: GemType.DIAMOND,
    sapphire: GemType.SAPPHIRE,
    emerald: GemType.EMERALD,
    ruby: GemType.RUBY,
    onyx: GemType.ONYX,
    gold: GemType.GOLD
  };

  // Convert cost object to array format needed by DevCard
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

// Helper function to get placeholder art URL based on card properties
const getCardArtUrl = (card: Card): string => {
  // For now, use placeholder images based on gem type and tier
  const gemName = card.gemBonus.toLowerCase();
  return `/card-art/${gemName}-tier${card.tier}.png`;
};

const GameCard: React.FC<GameCardProps> = ({
  card,
  onCardSelect,
  isDisabled = false,
  showSelectable = true
}) => {
  const costs = convertCostToPips(card.cost);
  const artUrl = getCardArtUrl(card);

  const handleClick = () => {
    if (!isDisabled && showSelectable && onCardSelect) {
      onCardSelect(card);
    }
  };

  return (
    <Box
      data-testid={`game-card-${card.id}`}
      onClick={handleClick}
      sx={{
        cursor: isDisabled ? 'not-allowed' : showSelectable ? 'pointer' : 'default',
        opacity: isDisabled ? 0.6 : 1,
        transition: 'transform 0.2s ease, opacity 0.2s ease',
        ...(showSelectable && !isDisabled && {
          '&:hover': {
            transform: 'translateY(-2px) scale(1.02)',
          }
        })
      }}
    >
      <DevCard
        value={card.prestige}
        artUrl={artUrl}
        costs={costs}
        bonusGem={card.gemBonus}
      />
    </Box>
  );
};

export default GameCard;
