import { Component, type ErrorInfo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Root-level error boundary. Any uncaught render error surfaces here instead of a blank screen.
 * Optional `fallback` overrides the default retry UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return (
      <Box sx={{ p: 4, maxWidth: 560, mx: 'auto', mt: 6 }}>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5">Algo deu errado</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              A aplicação encontrou um erro inesperado. Você pode tentar novamente ou recarregar a página.
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 1.5, bgcolor: 'action.hover', fontFamily: 'monospace', fontSize: 12, overflowX: 'auto' }}
            >
              {error.message}
            </Paper>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={this.reset}>
                Tentar novamente
              </Button>
              <Button onClick={() => window.location.reload()}>Recarregar</Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    );
  }
}
