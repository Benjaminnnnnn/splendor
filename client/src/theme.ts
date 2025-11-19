import { createTheme } from '@mui/material/styles';

// Define our spacing scale (4/8/12/16/24)
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48
};

// Define our border radius scale
const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16
};

// Size system for consistent component sizing
const sizes = {
  chip: {
    sm: { width: 24, height: 24, fontSize: '0.7rem' },
    md: { width: 32, height: 32, fontSize: '0.8rem' },
    lg: { width: 40, height: 40, fontSize: '0.9rem' }
  },
  card: {
    sm: { width: 120, height: 160 },
    md: { width: 140, height: 180 },
    lg: { width: 160, height: 200 }
  },
  noble: {
    width: 120,
    height: 80
  }
};

// Gem system with symbols, letters, and colors for accessibility
const gemSystem = {
  diamond: { color: '#E8E8E8', symbol: '◇', letter: 'D', contrastColor: '#000' },
  sapphire: { color: '#4169E1', symbol: '●', letter: 'S', contrastColor: '#FFF' },
  emerald: { color: '#50C878', symbol: '▲', letter: 'E', contrastColor: '#000' },
  ruby: { color: '#E0115F', symbol: '■', letter: 'R', contrastColor: '#FFF' },
  onyx: { color: '#36454F', symbol: '♦', letter: 'O', contrastColor: '#FFF' },
  gold: { color: '#FFD700', symbol: '★', letter: 'G', contrastColor: '#000' }
};

// Animation presets respecting user motion preferences
const animations = {
  hover: {
    duration: '0.2s',
    easing: 'ease-out',
    lift: 'translateY(-2px)',
    glow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  },
  popup: {
    duration: '0.15s',
    easing: 'ease-out',
    scale: 'scale(1.05)'
  },
  focus: {
    outline: '2px solid #3f51b5',
    outlineOffset: '2px'
  }
};

// Renaissance-inspired color palette
const colors = {
  primary: {
    main: '#8B4513', // Saddle Brown - rich, warm earth tone
    light: '#A0522D',
    dark: '#654321',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#DAA520', // Goldenrod - Renaissance gold
    light: '#FFD700',
    dark: '#B8860B',
    contrastText: '#000000'
  },
  background: {
    default: '#FFF8DC', // Cornsilk - warm parchment color
    paper: '#FFFEF7', // Slightly warmer white
    card: '#F5F5DC', // Beige for cards
    parchment: '#F4F1E8' // Parchment for placeholders
  },
  text: {
    primary: '#2C1810', // Dark brown for primary text
    secondary: '#5D4E37' // Medium brown for secondary text
  },
  divider: '#E8D5B7' // Light tan for dividers
};

export const theme = createTheme({
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Cinzel", "Times New Roman", serif',
      fontWeight: 600,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '0.02em'
    },
    h2: {
      fontFamily: '"Cinzel", "Times New Roman", serif',
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '0.01em'
    },
    h3: {
      fontFamily: '"Cinzel", "Times New Roman", serif',
      fontWeight: 500,
      fontSize: '1.5rem',
      lineHeight: 1.4
    },
    h4: {
      fontFamily: '"Cinzel", "Times New Roman", serif',
      fontWeight: 500,
      fontSize: '1.25rem',
      lineHeight: 1.4
    },
    h5: {
      fontFamily: '"Cinzel", "Times New Roman", serif',
      fontWeight: 500,
      fontSize: '1.1rem',
      lineHeight: 1.4
    },
    h6: {
      fontFamily: '"Cinzel", "Times New Roman", serif',
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.4
    },
    body1: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: '1rem',
      lineHeight: 1.5,
      fontWeight: 400
    },
    body2: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: '0.875rem',
      lineHeight: 1.43,
      fontWeight: 400
    },
    button: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      textTransform: 'none' as const,
      letterSpacing: '0.02em'
    }
  },
  palette: {
    mode: 'light',
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    text: colors.text,
    divider: colors.divider
  },
  shape: {
    borderRadius: borderRadius.lg
  },
  spacing: (factor: number) => spacing.xs * factor,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.xl,
          border: 'none',
          boxShadow: '0 4px 12px rgba(44, 24, 16, 0.1), 0 2px 4px rgba(44, 24, 16, 0.06)',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(44, 24, 16, 0.15), 0 4px 8px rgba(44, 24, 16, 0.1)'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.xl,
          border: 'none',
          boxShadow: '0 2px 8px rgba(44, 24, 16, 0.08), 0 1px 2px rgba(44, 24, 16, 0.04)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          padding: `${spacing.md}px ${spacing.xl}px`,
          boxShadow: '0 2px 4px rgba(44, 24, 16, 0.1)',
          border: 'none',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(44, 24, 16, 0.15)'
          }
        },
        contained: {
          background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${colors.primary.light} 0%, ${colors.primary.main} 100%)`
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
          boxShadow: '0 4px 12px rgba(44, 24, 16, 0.15)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
          border: `1px solid ${colors.divider}`,
          backgroundColor: colors.background.paper,
          boxShadow: '0 1px 2px rgba(44, 24, 16, 0.05)'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: borderRadius.lg,
            backgroundColor: colors.background.paper,
            '& fieldset': {
              borderColor: colors.divider,
              borderWidth: 1
            },
            '&:hover fieldset': {
              borderColor: colors.primary.light
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary.main,
              borderWidth: 2
            }
          }
        }
      }
    }
  }
});

// Export all design system objects for use in components
export { spacing, borderRadius, colors, sizes, gemSystem, animations };
