import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ROLE_HOME } from '../../contexts/AuthContext';
import { loginSchema, type LoginFormValues } from '../../schemas/auth.schema';
import {
  extractErrorCode,
  extractFieldErrors,
  getErrorMessage,
} from '../../utils/errorMessage';
import AuthPageShell from '../../components/auth/AuthPageShell';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const user = await login(values);

      const next = searchParams.get('next');
      navigate(next ? decodeURIComponent(next) : ROLE_HOME[user.role], {
        replace: true,
      });
    } catch (err) {
      const code = extractErrorCode(err);

      switch (code) {
        case 'AUTH_INVALID_CREDENTIALS':
          setError('root', { message: getErrorMessage(code) });
          break;

        case 'ACCOUNT_LOCKED':
        case 'ACCOUNT_SUSPENDED':
          showToast(getErrorMessage(code), 'warning');
          break;

        case 'VALIDATION_ERROR': {
          const fieldErrors = extractFieldErrors(err);
          if (fieldErrors) {
            Object.entries(fieldErrors).forEach(([field, message]) => {
              setError(field as keyof LoginFormValues, { message });
            });
          } else {
            showToast(getErrorMessage(code), 'error');
          }
          break;
        }

        default:
          showToast(getErrorMessage(code), 'error');
      }
    }
  };

  return (
    <AuthPageShell maxWidth={480}>
        <Typography
          variant="h4"
          color="primary"
          sx={{ fontWeight: 600, mb: 0.5, fontSize: { xs: '1.5rem', sm: '1.75rem' } }}
        >
          Đăng nhập
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5 }}>
          Đặt chỗ học tập tại các Study Café yêu thích
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}
        >
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            fullWidth
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />

          <TextField
            label="Mật khẩu"
            type="password"
            autoComplete="current-password"
            fullWidth
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />

          {errors.root?.message && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              {errors.root.message}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={isSubmitting}
            sx={{ mt: 1 }}
          >
            {isSubmitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              'Đăng nhập'
            )}
          </Button>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2.5, textAlign: 'center' }}
        >
          Chưa có tài khoản?{' '}
          <Link
            component={RouterLink}
            to="/register"
            color="primary"
            sx={{ fontWeight: 500 }}
          >
            Đăng ký ngay
          </Link>
        </Typography>
    </AuthPageShell>
  );
}
