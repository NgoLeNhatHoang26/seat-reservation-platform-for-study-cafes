import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AuthPageShell from '../../components/auth/AuthPageShell';
import VerificationDocumentField from '../../components/auth/VerificationDocumentField';
import { ROLE_HOME } from '../../contexts/AuthContext';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  registerCustomerSchema,
  registerOwnerSchema,
  type RegisterCustomerFormValues,
  type RegisterOwnerFormValues,
} from '../../schemas/auth.schema';
import { uploadRegistrationImage } from '../../services/uploadService';
import {
  extractErrorCode,
  extractFieldErrors,
  getErrorMessage,
} from '../../utils/errorMessage';

type RoleTab = 'CUSTOMER' | 'OWNER';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 5;

function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Chỉ chấp nhận file JPG, PNG hoặc WEBP.';
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Kích thước tối đa ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null;
}

function CustomerForm() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterCustomerFormValues>({
    resolver: zodResolver(registerCustomerSchema),
  });

  const onSubmit = async (values: RegisterCustomerFormValues) => {
    try {
      const user = await registerAuth({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        phone: values.phone || undefined,
        preferredCity: values.preferredCity || undefined,
      });
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      const code = extractErrorCode(err);

      if (code === 'EMAIL_ALREADY_REGISTERED') {
        setError('email', { message: getErrorMessage(code) });
        return;
      }

      if (code === 'VALIDATION_ERROR') {
        const fieldErrors = extractFieldErrors(err);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            setError(field as keyof RegisterCustomerFormValues, { message });
          });
          return;
        }
      }

      showToast(getErrorMessage(code), 'error');
    }
  };

  return (
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
        autoComplete="new-password"
        fullWidth
        {...register('password')}
        error={!!errors.password}
        helperText={errors.password?.message ?? 'Ít nhất 8 ký tự, gồm chữ cái và số'}
      />

      <TextField
        label="Họ và tên"
        autoComplete="name"
        fullWidth
        {...register('fullName')}
        error={!!errors.fullName}
        helperText={errors.fullName?.message}
      />

      <TextField
        label="Số điện thoại (tùy chọn)"
        type="tel"
        autoComplete="tel"
        fullWidth
        {...register('phone')}
        error={!!errors.phone}
        helperText={errors.phone?.message}
      />

      <TextField
        label="Thành phố ưu thích (tùy chọn)"
        fullWidth
        {...register('preferredCity')}
        error={!!errors.preferredCity}
        helperText={errors.preferredCity?.message}
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
        {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Tạo tài khoản'}
      </Button>
    </Box>
  );
}

function OwnerForm() {
  const { registerOwner } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [businessLicenseFile, setBusinessLicenseFile] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [businessLicensePreview, setBusinessLicensePreview] = useState<string | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [businessLicenseError, setBusinessLicenseError] = useState<string | null>(null);
  const [idCardError, setIdCardError] = useState<string | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterOwnerFormValues>({
    resolver: zodResolver(registerOwnerSchema),
  });

  useEffect(() => {
    if (!businessLicenseFile) {
      setBusinessLicensePreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(businessLicenseFile);
    setBusinessLicensePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [businessLicenseFile]);

  useEffect(() => {
    if (!idCardFile) {
      setIdCardPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(idCardFile);
    setIdCardPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [idCardFile]);

  const handleBusinessLicenseSelect = (file: File | null) => {
    if (!file) {
      setBusinessLicenseFile(null);
      setBusinessLicenseError(null);
      return;
    }
    const validationError = validateImageFile(file);
    if (validationError) {
      setBusinessLicenseFile(null);
      setBusinessLicenseError(validationError);
      return;
    }
    setBusinessLicenseFile(file);
    setBusinessLicenseError(null);
  };

  const handleIdCardSelect = (file: File | null) => {
    if (!file) {
      setIdCardFile(null);
      setIdCardError(null);
      return;
    }
    const validationError = validateImageFile(file);
    if (validationError) {
      setIdCardFile(null);
      setIdCardError(validationError);
      return;
    }
    setIdCardFile(file);
    setIdCardError(null);
  };

  const onSubmit = async (values: RegisterOwnerFormValues) => {
    if (!businessLicenseFile) {
      setBusinessLicenseError('Vui lòng tải lên giấy phép kinh doanh.');
      return;
    }
    if (!idCardFile) {
      setIdCardError('Vui lòng tải lên căn cước công dân.');
      return;
    }

    setUploadingDocs(true);
    try {
      const [businessLicense, idCard] = await Promise.all([
        uploadRegistrationImage({ file: businessLicenseFile, docType: 'business-license' }),
        uploadRegistrationImage({ file: idCardFile, docType: 'id-card' }),
      ]);

      const result = await registerOwner({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        phone: values.phone || undefined,
        documents: {
          businessLicenseUrl: businessLicense.url,
          idCardUrl: idCard.url,
        },
      });

      showToast(result.message, 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      const code = extractErrorCode(err);

      if (code === 'EMAIL_ALREADY_REGISTERED') {
        setError('email', { message: getErrorMessage(code) });
        return;
      }

      if (code === 'VALIDATION_ERROR') {
        const fieldErrors = extractFieldErrors(err);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            setError(field as keyof RegisterOwnerFormValues, { message });
          });
          return;
        }
      }

      showToast(getErrorMessage(code), 'error');
    } finally {
      setUploadingDocs(false);
    }
  };

  const isBusy = isSubmitting || uploadingDocs;

  return (
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
        autoComplete="new-password"
        fullWidth
        {...register('password')}
        error={!!errors.password}
        helperText={errors.password?.message ?? 'Ít nhất 8 ký tự, gồm chữ cái và số'}
      />

      <TextField
        label="Họ và tên"
        autoComplete="name"
        fullWidth
        {...register('fullName')}
        error={!!errors.fullName}
        helperText={errors.fullName?.message}
      />

      <TextField
        label="Số điện thoại (tùy chọn)"
        type="tel"
        autoComplete="tel"
        fullWidth
        {...register('phone')}
        error={!!errors.phone}
        helperText={errors.phone?.message}
      />

      <Box sx={{ pt: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.75 }}>
          Giấy tờ xác minh
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
          Để được duyệt tài khoản chủ quán, vui lòng tải lên ảnh chụp rõ ràng, đầy đủ thông tin của:
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, mb: 2, color: 'text.secondary' }}>
          <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
            Giấy phép kinh doanh (bản scan hoặc ảnh chụp còn hiệu lực)
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
            Căn cước công dân mặt trước và mặt sau (có thể ghép trong một ảnh)
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Admin sẽ xem xét hồ sơ trong vòng 1–3 ngày làm việc. Sau khi được duyệt, bạn mới có thể
          đăng nhập và quản lý quán.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <VerificationDocumentField
            label="Giấy phép kinh doanh"
            helperText="JPG, PNG hoặc WEBP — tối đa 5MB"
            previewUrl={businessLicensePreview}
            uploading={uploadingDocs}
            error={businessLicenseError ?? undefined}
            onFileSelect={handleBusinessLicenseSelect}
          />

          <VerificationDocumentField
            label="Căn cước công dân"
            helperText="Ảnh rõ nét, không bị che khuất thông tin"
            previewUrl={idCardPreview}
            uploading={uploadingDocs}
            error={idCardError ?? undefined}
            onFileSelect={handleIdCardSelect}
          />
        </Box>
      </Box>

      {errors.root?.message && (
        <Alert severity="error" sx={{ py: 0.5 }}>
          {errors.root.message}
        </Alert>
      )}

      <Button type="submit" variant="contained" size="large" fullWidth disabled={isBusy} sx={{ mt: 0.5 }}>
        {isBusy ? <CircularProgress size={22} color="inherit" /> : 'Gửi hồ sơ đăng ký'}
      </Button>
    </Box>
  );
}

export default function RegisterPage() {
  const [role, setRole] = useState<RoleTab>('CUSTOMER');

  return (
    <AuthPageShell maxWidth={role === 'OWNER' ? 600 : 540}>
      <Typography
        variant="h4"
        color="primary"
        sx={{ fontWeight: 600, mb: 0.5, fontSize: { xs: '1.5rem', sm: '1.75rem' } }}
      >
        Tạo tài khoản
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
        Chọn loại tài khoản phù hợp với bạn
      </Typography>

      <ToggleButtonGroup
        value={role}
        exclusive
        onChange={(_, value: RoleTab | null) => {
          if (value) setRole(value);
        }}
        fullWidth
        sx={{ mb: 1.5 }}
      >
        <ToggleButton value="CUSTOMER" sx={{ fontWeight: 500 }}>
          Khách hàng
        </ToggleButton>
        <ToggleButton value="OWNER" sx={{ fontWeight: 500 }}>
          Chủ quán
        </ToggleButton>
      </ToggleButtonGroup>

      {role === 'CUSTOMER' ? <CustomerForm /> : <OwnerForm />}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5, textAlign: 'center' }}>
        Đã có tài khoản?{' '}
        <Link component={RouterLink} to="/login" color="primary" sx={{ fontWeight: 500 }}>
          Đăng nhập
        </Link>
      </Typography>
    </AuthPageShell>
  );
}
