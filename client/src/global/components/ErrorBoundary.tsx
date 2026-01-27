import { Component, type ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleRefresh = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            textAlign: 'center',
            bgcolor: 'background.default'
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '20px',
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
              fontSize: 40
            }}
          >
            😵
          </Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}
          >
            משהו השתבש
          </Typography>
          <Typography
            sx={{ color: 'text.secondary', mb: 3, maxWidth: 300 }}
          >
            אירעה שגיאה בלתי צפויה. נסה לרענן את הדף או לחזור אחורה.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={this.handleReset}
              sx={{ borderRadius: '12px', px: 3 }}
            >
              נסה שוב
            </Button>
            <Button
              variant="contained"
              onClick={this.handleRefresh}
              sx={{ borderRadius: '12px', px: 3 }}
            >
              רענן דף
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
