import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Typography,
} from '@mui/material';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import AuthPageShell from '../../components/auth/AuthPageShell';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import * as authService from '../../services/authService';
import { extractErrorCode, getErrorMessage } from '../../utils/errorMessage';

type VerifyState = 'loading' | 'success' | 'error' | 'missing-token';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAuthenticated, refreshMe } = useAuth();

  const token = searchParams.get('token');
  const [state, setState] = useState<VerifyState>(token ? 'loading' : 'missing-token');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await authService.verifyEmail(token);
        if (cancelled) return;

        setState('success');
        setMessage(result.message);

        if (isAuthenticated) {
          await refreshMe();
        }
      } catch (err) {
        if (cancelled) return;
        setState('error');
        setMessage(getErrorMessage(extractErrorCode(err)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated, refreshMe]);

  const handleResend = async () => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    setResending(true);
    try {
      const result = await authService.resendVerificationEmail();
      showToast(result.message, 'success');
    } catch (err) {
      showToast(getErrorMessage(extractErrorCode(err)), 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthPageShell maxWidth={520}>
      {state === 'loading' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
          <CircularProgress />
          <Typography color="text.secondary">Đang xác minh email...</Typography>
        </Box>
      )}

      {state === 'missing-token' && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <ErrorOutlineOutlinedIcon color="error" sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
            Link không hợp lệ
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            Thiếu mã xác minh trong link. Vui lòng mở link từ email hoặc gửi lại email xác minh.
          </Alert>
          {isAuthenticated ? (
            <Button variant="contained" fullWidth onClick={handleResend} disabled={resending}>
              {resending ? <CircularProgress size={22} color="inherit" /> : 'Gửi lại email xác minh'}
            </Button>
          ) : (
            <Button component={RouterLink} to="/login" variant="contained" fullWidth>
              Đăng nhập
            </Button>
          )}
        </>
      )}

      {state === 'success' && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <MarkEmailReadOutlinedIcon color="success" sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
            Xác minh thành công
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            {message || 'Email của bạn đã được xác minh. Bạn có thể đặt chỗ ngay bây giờ.'}
          </Alert>
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate(isAuthenticated ? '/cafes' : '/login', { replace: true })}
          >
            {isAuthenticated ? 'Khám phá quán' : 'Đăng nhập'}
          </Button>
        </>
      )}

      {state === 'error' && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <ErrorOutlineOutlinedIcon color="error" sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
            Xác minh thất bại
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            {message}
          </Alert>
          {isAuthenticated ? (
            <Button variant="contained" fullWidth onClick={handleResend} disabled={resending}>
              {resending ? <CircularProgress size={22} color="inherit" /> : 'Gửi lại email xác minh'}
            </Button>
          ) : (
            <Button component={RouterLink} to="/login" variant="contained" fullWidth>
              Đăng nhập
            </Button>
          )}
        </>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5, textAlign: 'center' }}>
        <Link component={RouterLink} to="/" underline="hover">
          Về trang chủ
        </Link>
      </Typography>
    </AuthPageShell>
  );
}
