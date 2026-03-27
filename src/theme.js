import { alpha, createTheme } from '@mui/material/styles';

export function buildAppTheme(mode) {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#7c4dff'
      },
      secondary: {
        main: '#26c6da'
      },
      background: {
        default: isDark ? '#0b1220' : '#f3f4f6',
        paper: isDark ? '#0f172a' : '#ffffff'
      }
    },
    shape: {
      borderRadius: 18
    },
    typography: {
      fontFamily: 'Inter, Roboto, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      h5: {
        fontWeight: 700
      },
      h6: {
        fontWeight: 700
      },
      button: {
        textTransform: 'none',
        fontWeight: 600
      }
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 24,
            boxShadow: isDark
              ? '0 14px 42px rgba(0,0,0,0.34)'
              : '0 12px 34px rgba(15,23,42,0.08)'
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${alpha(isDark ? '#94a3b8' : '#cbd5e1', isDark ? 0.18 : 0.5)}`
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isDark
              ? 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.72))'
              : 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.84))',
            backdropFilter: 'blur(18px)',
            color: isDark ? '#e5e7eb' : '#111827',
            boxShadow: 'none',
            borderBottom: `1px solid ${alpha(isDark ? '#94a3b8' : '#cbd5e1', isDark ? 0.18 : 0.72)}`
          }
        }
      }
    }
  });
}
