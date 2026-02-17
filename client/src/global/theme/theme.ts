import { createTheme, type ThemeOptions } from '@mui/material/styles';
import type { ThemeMode, Language } from '../types';

// ===== פלטת צבעים =====
const COLORS = {
  primary: {
    main: '#14B8A6',
    dark: '#0D9488',
    light: '#5EEAD4'
  },
  secondary: {
    main: '#10B981',
    dark: '#059669'
  },
  error: {
    main: '#EF4444',
    dark: '#DC2626'
  },
  warning: {
    main: '#F59E0B',
    dark: '#D97706',
    light: '#FEF3C7'
  },
  success: {
    main: '#22C55E',
    dark: '#16A34A'
  },
  // צבעי מצב בהיר
  light: {
    background: '#F8FAFC',
    paper: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    divider: '#F3F4F6',
    border: '#E5E7EB',
    inputBg: '#FFFFFF',
    headerGradient: 'linear-gradient(135deg, #14B8A6, #0D9488)',
    cardShadow: '0 2px 8px rgba(0,0,0,0.04)'
  },
  // צבעי מצב כהה
  dark: {
    background: '#111827',
    paper: '#1F2937',
    card: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    divider: '#374151',
    border: '#4B5563',
    inputBg: '#374151',
    headerGradient: 'linear-gradient(135deg, #0D9488, #047857)',
    cardShadow: '0 4px 12px rgba(0,0,0,0.5)'
  }
} as const;

const getBaseTheme = (mode: ThemeMode, language: Language): ThemeOptions => {
  const isRtl = language === 'he';
  const isDark = mode === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  return {
    direction: isRtl ? 'rtl' : 'ltr',

    palette: {
      mode,
      primary: { ...COLORS.primary, contrastText: '#fff' },
      secondary: COLORS.secondary,
      error: COLORS.error,
      warning: COLORS.warning,
      success: COLORS.success,
      background: {
        default: colors.background,
        paper: colors.paper
      },
      text: {
        primary: colors.text,
        secondary: colors.textSecondary
      },
      divider: colors.divider
    },

    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: { fontSize: '24px', fontWeight: 700 },
      h2: { fontSize: '18px', fontWeight: 700 },
      body1: { fontSize: '15px' },
      body2: { fontSize: '13px' },
      button: { fontSize: '15px', fontWeight: 600, textTransform: 'none' }
    },

    shape: { borderRadius: 12 },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: colors.background,
            color: colors.text,
            transition: 'background-color 0.3s ease, color 0.3s ease'
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            minHeight: 48,
            boxShadow: 'none',
            transition: 'all 0.2s ease',
            '&:hover': { boxShadow: 'none' }
          },
          containedPrimary: {
            background: 'linear-gradient(135deg, #14B8A6, #10B981)',
            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #0D9488, #059669)',
              boxShadow: '0 6px 16px rgba(20, 184, 166, 0.4)'
            }
          },
          containedError: {
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #DC2626, #B91C1C)'
            }
          },
          outlined: {
            borderColor: colors.border,
            color: colors.text,
            '&:hover': {
              borderColor: COLORS.primary.main,
              backgroundColor: isDark ? 'rgba(20, 184, 166, 0.1)' : 'rgba(20, 184, 166, 0.05)'
            }
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            width: 48,
            height: 48,
            borderRadius: 14,
            transition: 'all 0.2s ease'
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              minHeight: 52,
              backgroundColor: colors.inputBg,
              transition: 'all 0.2s ease',
              '& fieldset': {
                borderWidth: 2,
                borderColor: colors.border,
                transition: 'border-color 0.2s ease'
              },
              '&:hover fieldset': {
                borderColor: COLORS.primary.main
              },
              '&.Mui-focused fieldset': {
                borderColor: COLORS.primary.main
              }
            },
            '& .MuiInputBase-input': {
              textAlign: isRtl ? 'right' : 'left',
              color: colors.text
            },
            '& .MuiInputLabel-root': {
              color: colors.textSecondary
            },
            '& .MuiInputAdornment-root': {
              color: colors.textSecondary
            }
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: colors.cardShadow,
            border: `1px solid ${colors.divider}`,
            backgroundColor: colors.card,
            transition: 'all 0.2s ease'
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: colors.paper,
            transition: 'background-color 0.3s ease'
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: '24px 24px 0 0',
            margin: 0,
            maxWidth: 600,
            width: '100%',
            maxHeight: '85vh',
            position: 'fixed',
            bottom: 0,
            backgroundColor: colors.paper
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600
          },
          sizeSmall: {
            fontSize: 11,
            height: 22
          }
        }
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            height: 'auto',
            padding: '4px 0',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            borderTop: `1px solid ${colors.divider}`,
            boxShadow: isDark ? '0 -2px 10px rgba(0,0,0,0.2)' : '0 -2px 10px rgba(0,0,0,0.05)',
            backgroundColor: colors.paper
          }
        }
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            padding: '6px 14px',
            borderRadius: 10,
            minWidth: 'auto',
            color: colors.textSecondary,
            '&.Mui-selected': {
              color: COLORS.primary.main
            }
          },
          label: {
            fontSize: 11,
            '&.Mui-selected': {
              fontSize: 11
            }
          }
        }
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: 4,
            minHeight: 'auto'
          },
          indicator: {
            display: 'none'
          }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: 10,
            minHeight: 'auto',
            fontSize: 13,
            fontWeight: 600,
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.9)',
            textTransform: 'none',
            transition: 'all 0.2s ease',
            '&.Mui-selected': {
              background: colors.paper,
              color: COLORS.primary.main
            }
          }
        }
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            width: 44,
            height: 44,
            fontWeight: 700,
            fontSize: 18
          }
        }
      },
      MuiFab: {
        styleOverrides: {
          root: {
            background: 'linear-gradient(135deg, #14B8A6, #10B981)',
            boxShadow: '0 4px 16px rgba(20, 184, 166, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #0D9488, #059669)'
            }
          }
        }
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 52,
            height: 32,
            padding: 0
          },
          switchBase: {
            padding: 4,
            '&.Mui-checked': {
              transform: 'translateX(20px)',
              '& + .MuiSwitch-track': {
                backgroundColor: COLORS.primary.main,
                opacity: 1
              }
            }
          },
          thumb: {
            width: 24,
            height: 24,
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          },
          track: {
            borderRadius: 16,
            backgroundColor: colors.border,
            opacity: 1,
            transition: 'background-color 0.2s ease'
          }
        }
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12
          },
          standardError: {
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
            color: isDark ? '#FCA5A5' : '#DC2626'
          },
          standardSuccess: {
            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#F0FDF4',
            color: isDark ? '#86EFAC' : '#16A34A'
          }
        }
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: colors.border
          }
        }
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: colors.divider
          }
        }
      }
    }
  };
};

export const createAppTheme = (mode: ThemeMode, language: Language) => {
  return createTheme(getBaseTheme(mode, language));
};
