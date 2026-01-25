import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  direction: 'rtl',

  palette: {
    primary: {
      main: '#14B8A6',
      dark: '#0D9488',
      light: '#5EEAD4',
      contrastText: '#fff'
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
      dark: '#D97706'
    },
    success: {
      main: '#22C55E',
      dark: '#16A34A'
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF'
    },
    text: {
      primary: '#1F2937',
      secondary: '#6B7280'
    },
    divider: '#F3F4F6'
  },

  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    h1: { fontSize: '24px', fontWeight: 700 },
    h2: { fontSize: '18px', fontWeight: 700 },
    body1: { fontSize: '15px' },
    body2: { fontSize: '13px' },
    button: { fontSize: '15px', fontWeight: 600, textTransform: 'none' }
  },

  shape: {
    borderRadius: 12
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          minHeight: 48,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' }
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #14B8A6, #10B981)',
          boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #0D9488, #059669)'
          }
        },
        containedError: {
          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #DC2626, #B91C1C)'
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          width: 44,
          height: 44,
          borderRadius: 14
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            minHeight: 52,
            '& fieldset': {
              borderWidth: 2,
              borderColor: '#E5E7EB'
            },
            '&:hover fieldset': {
              borderColor: '#14B8A6'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#14B8A6'
            }
          },
          '& .MuiInputBase-input': {
            textAlign: 'right'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #F1F5F9'
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
          bottom: 0
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
          borderTop: '1px solid #F3F4F6',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
        }
      }
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          padding: '6px 14px',
          borderRadius: 10,
          minWidth: 'auto',
          '&.Mui-selected': {
            color: '#14B8A6'
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
          background: 'rgba(255,255,255,0.15)',
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
          color: 'rgba(255,255,255,0.9)',
          textTransform: 'none',
          '&.Mui-selected': {
            background: 'white',
            color: '#14B8A6'
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
    }
  }
});
