import { useState } from 'react';
import { Alert, Button, CircularProgress } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import * as authService from '../../services/authService';
import { extractErrorCode, getErrorMessage } from '../../utils/errorMessage';

export default function EmailVerificationBanner() {
  const { currentUser, refreshMe } = useAuth();
  const { showToast } = useToast();
  const [resending, setResending] = useState(false);

  if (!currentUser || currentUser.status !== 'PENDING_EMAIL_VERIFICATION') {
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    try {
      const result = await authService.resendVerificationEmail();
      await refreshMe();
      showToast(result.message, 'success');
    } catch (err) {
      showToast(getErrorMessage(extractErrorCode(err)), 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? <CircularProgress size={18} color="inherit" /> : 'Gửi lại email'}
        </Button>
      }
    >
      Vui lòng xác minh email <strong>{currentUser.email}</strong> trước khi đặt chỗ.
    </Alert>
  );
}
