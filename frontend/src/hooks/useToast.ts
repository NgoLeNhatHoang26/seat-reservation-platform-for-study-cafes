import { useToastContext } from '../contexts/ToastContext';

export function useToast() {
  const { showToast } = useToastContext();

  return {
    showToast,
    showSuccess: (message: string, duration?: number) =>
      showToast(message, 'success', duration),
    showError: (message: string, duration?: number) =>
      showToast(message, 'error', duration),
    showWarning: (message: string, duration?: number) =>
      showToast(message, 'warning', duration),
    showInfo: (message: string, duration?: number) =>
      showToast(message, 'info', duration),
  };
}
