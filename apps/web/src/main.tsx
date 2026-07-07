import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { ptBR } from 'date-fns/locale';
import { ThemeModeProvider } from './theme-mode';
import { ConfirmProvider } from './hooks/useConfirm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { App } from './App';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <ConfirmProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
            <BrowserRouter>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </BrowserRouter>
          </LocalizationProvider>
        </ConfirmProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
