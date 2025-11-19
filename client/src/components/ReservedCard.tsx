import React from 'react';
import { Box, Paper, Typography, Tooltip } from '@mui/material';
import { Card } from '../../../shared/types/game';
import JewelBadge from './JewelBadge';
import CostPip from './CostPip';
import { GemType } from '../../../shared/types/game';

interface ReservedCardProps {
  card: Card;
  onClick?: (card: Card) => void;
  disabled?: boolean;
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

const ReservedCard: React.FC<ReservedCardProps> = ({ card, onClick, disabled = false }) => {
  const costs = convertCostToPips(card.cost);
  const artUrl = getCardArtUrl(card);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(card);
    }
  };

  // Small card component (40x55 pixels)
  const SmallCard = (
    <Paper
      data-testid={`reserved-card-${card.id}`}
      elevation={4}
      sx={{
        position: "relative",
        width: 40,
        height: 55,
        borderRadius: 1,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #cbd5e1",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.2s ease",
        opacity: disabled ? 0.8 : 1,
        '&:hover': disabled ? {} : {
          transform: 'scale(1.05)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }
      }}
      onClick={handleClick}
    >
      {/* Background artwork */}
      <Box sx={{
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${artUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "saturate(1.1) contrast(1.1)"
      }} />

      {/* Frosted header */}
      <Box sx={{
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        height: "40%",
        background: "rgba(248, 250, 252, 0.3)",
        backdropFilter: "blur(2px)",
        borderBottom: "1px solid rgba(203, 213, 225, 0.3)"
      }}>
        {/* Prestige value */}
        {card.prestige >= 1 && (
          <Typography sx={{
            position: "absolute",
            top: 1,
            left: 2,
            fontFamily: "Cinzel, serif",
            fontWeight: 900,
            fontSize: 8,
            color: "#fff",
            textShadow: "0 1px 1px rgba(0, 0, 0, 0.8)"
          }}>
            {card.prestige}
          </Typography>
        )}

        {/* Bonus gem */}
        <Box sx={{
          position: "absolute",
          top: 1,
          right: 2,
          transform: "scale(0.3)",
          transformOrigin: "top right"
        }}>
          <JewelBadge gem={card.gemBonus} />
        </Box>
      </Box>

      {/* Cost pips at bottom */}
      <Box sx={{
        position: "absolute",
        left: 1,
        bottom: 1,
        display: "flex",
        flexDirection: "column",
        gap: 0.2,
        alignItems: "flex-start"
      }}>
        {costs.slice(0, 3).map((c, index) => (
          <Box key={`${c.gem}-${index}`} sx={{ transform: "scale(0.4)", transformOrigin: "left bottom" }}>
            <CostPip gem={c.gem} n={c.n} />
          </Box>
        ))}
        {costs.length > 3 && (
          <Typography sx={{
            fontSize: 4,
            color: "#fff",
            textShadow: "0 1px 1px rgba(0, 0, 0, 0.8)",
            fontWeight: 600
          }}>
            +{costs.length - 3}
          </Typography>
        )}
      </Box>
    </Paper>
  );

  // Large hover preview (scaled version of original DevCard)
  const LargePreview = (
    <Paper
      elevation={6}
      sx={{
        position: "relative",
        width: 160,
        height: 220,
        borderRadius: 2,
        overflow: "hidden",
        background: "#fff",
        border: "2px solid #cbd5e1",
        boxShadow: "0 10px 25px rgba(0,0,0,.15), 0 4px 10px rgba(0,0,0,.1)",
        "&:before": {
          content: '""',
          position: "absolute",
          inset: 2,
          borderRadius: 1,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,.8), inset 0 1px 0 rgba(255,255,255,.9)"
        }
      }}
    >
      {/* artwork area */}
      <Box sx={{
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${artUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "saturate(1.1) contrast(1.1)"
      }} />

      {/* translucent frosted header overlay */}
      <Box sx={{
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        height: "25%",
        background: "rgba(248, 250, 252, 0.2)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(203, 213, 225, 0.3)"
      }}>
        {/* prestige value */}
        {card.prestige >= 1 && (
          <Typography sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 2,
            fontFamily: "Cinzel, serif",
            fontWeight: 900,
            fontSize: 24,
            color: "#fff",
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)"
          }}>
            {card.prestige}
          </Typography>
        )}

        {/* bonus jewel */}
        <Box sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 2,
          transform: "scale(0.7)",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,.2))"
        }}>
          <JewelBadge gem={card.gemBonus} />
        </Box>
      </Box>

      {/* cost column */}
      <Box sx={{
        position: "absolute",
        left: 6,
        bottom: 8,
        display: "flex",
        flexDirection: "column",
        gap: 0.3,
        alignItems: "flex-start",
        zIndex: 2
      }}>
        {costs.map((c, index) => (
          <Box key={`${c.gem}-${index}`} sx={{ transform: "scale(0.7)" }}>
            <CostPip gem={c.gem} n={c.n} />
          </Box>
        ))}
      </Box>
    </Paper>
  );

  return (
    <Tooltip
      title={LargePreview}
      placement="top"
      arrow
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: 'transparent',
            maxWidth: 'none',
            p: 1
          }
        },
        arrow: {
          sx: {
            color: '#cbd5e1'
          }
        }
      }}
    >
      {SmallCard}
    </Tooltip>
  );
};

export default ReservedCard;
