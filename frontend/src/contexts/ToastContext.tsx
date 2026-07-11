import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Snackbar } from '@mui/material';

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export interface ToastContextValue {
  showToast: (message: string, severity?: ToastSeverity, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

interface ActiveToast {
  message: string;
  severity: ToastSeverity;
  key: number;
  duration: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const [open, setOpen] = useState(false);

  const showToast = useCallback(
    (message: string, severity: ToastSeverity = 'info', duration = 5000) => {
      setToast({ message, severity, key: Date.now(), duration });
      setOpen(true);
    },
    [],
  );

  const handleClose = (_: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        key={toast?.key}
        open={open}
        autoHideDuration={toast?.duration ?? 5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={toast?.severity ?? 'info'}
          variant="filled"
          sx={{ minWidth: 280 }}
        >
          {toast?.message ?? ''}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
