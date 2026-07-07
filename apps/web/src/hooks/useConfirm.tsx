import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Resolver = (result: boolean) => void;

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Provider for `useConfirm()` — mount once near the root. Replaces window.confirm() with a
 * theme-aware, dark-mode-friendly MUI dialog that returns a Promise<boolean>.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
      setOpen(true);
    });
  }, []);

  const handle = (result: boolean) => {
    setOpen(false);
    const resolver = resolverRef.current;
    resolverRef.current = null;
    if (resolver) resolver(result);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={open} onClose={() => handle(false)} maxWidth="xs" fullWidth>
        {options?.title && <DialogTitle>{options.title}</DialogTitle>}
        <DialogContent>
          <DialogContentText>{options?.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handle(false)}>{options?.cancelLabel ?? 'Cancelar'}</Button>
          <Button
            onClick={() => handle(true)}
            variant="contained"
            color={options?.destructive ? 'error' : 'primary'}
            autoFocus
          >
            {options?.confirmLabel ?? 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
