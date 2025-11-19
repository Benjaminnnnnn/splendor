import React from 'react';
import { Box, Typography } from '@mui/material';
import { GemType } from '../../../shared/types/game';
import { sizes, gemSystem, animations } from '../theme';
import { getGemContrastColor } from '../constants/gemColors';

interface GemChipProps {
  gem: GemType;
  count: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
}

const GemChip: React.FC<GemChipProps> = ({
  gem,
  count,
  size = 'md',
  interactive = false,
  disabled = false,
  selected = false,
  onClick,
  'aria-label': ariaLabel,
  ...props
}) => {
  const chipSize = sizes.chip[size];
  const gemInfo = gemSystem[gem];
  const contrastColor = getGemContrastColor(gem);

  return (
    <Box
      component={interactive ? 'button' : 'div'}
      onClick={interactive && !disabled ? onClick : undefined}
      disabled={disabled}
      aria-label={ariaLabel || `${gem} gem: ${count}`}
      aria-pressed={interactive ? selected : undefined}
      tabIndex={interactive && !disabled ? 0 : -1}
      sx={{
        width: chipSize.width,
        height: chipSize.height,
        borderRadius: '50%',
        border: 'none',
        cursor: interactive && !disabled ? 'pointer' : 'default',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 0.2,

        // Embossed effect with gradient and shadows
        background: `
          radial-gradient(circle at 30% 30%,
            ${gemInfo.color}E6 0%,
            ${gemInfo.color} 60%,
            ${gemInfo.color}CC 100%
          )
        `,
        boxShadow: `
          inset 1px 1px 2px rgba(255, 255, 255, 0.4),
          inset -1px -1px 2px rgba(0, 0, 0, 0.2),
          0 2px 4px rgba(0, 0, 0, 0.15)
        `,

        // Interactive states
        ...(interactive && !disabled && {
          '&:hover': {
            transform: animations.hover.lift,
            boxShadow: `
              inset 1px 1px 2px rgba(255, 255, 255, 0.5),
              inset -1px -1px 2px rgba(0, 0, 0, 0.25),
              ${animations.hover.glow}
            `,
            transition: `all ${animations.hover.duration} ${animations.hover.easing}`,
            '@media (prefers-reduced-motion: reduce)': {
              transform: 'none',
              transition: 'none'
            }
          },

          '&:focus-visible': {
            outline: animations.focus.outline,
            outlineOffset: animations.focus.outlineOffset,
            '@media (prefers-reduced-motion: reduce)': {
              outline: '2px solid currentColor'
            }
          },

          '&:active': {
            transform: 'translateY(1px)',
            boxShadow: `
              inset 1px 1px 2px rgba(0, 0, 0, 0.3),
              inset -1px -1px 2px rgba(255, 255, 255, 0.3),
              0 1px 2px rgba(0, 0, 0, 0.1)
            `
          }
        }),

        // Selected state
        ...(selected && {
          boxShadow: `
            inset 0 0 0 2px #4169E1,
            inset 1px 1px 2px rgba(255, 255, 255, 0.4),
            inset -1px -1px 2px rgba(0, 0, 0, 0.2),
            0 0 8px rgba(65, 105, 225, 0.3)
          `
        }),

        // Disabled state
        ...(disabled && {
          opacity: 0.5,
          cursor: 'not-allowed',
          filter: 'grayscale(30%)'
        })
      }}
      {...props}
    >
      {/* Count */}
      {count > 0 && (
        <Typography
          variant="body2"
          sx={{
            fontSize: size === 'sm' ? '0.65rem' : size === 'lg' ? '0.85rem' : '0.75rem',
            fontWeight: 'bold',
            color: contrastColor,
            lineHeight: 1,
            textShadow: '0 1px 1px rgba(0, 0, 0, 0.3)',
            userSelect: 'none'
          }}
        >
          {count}
        </Typography>
      )}
    </Box>
  );
};

export default GemChip;
