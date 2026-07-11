import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import StoreOutlinedIcon from '@mui/icons-material/StoreOutlined';
import { profileFormSchema, type ProfileFormValues } from '../../schemas/profile.schema';
import { useUpdateProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import StatusChip from '../../components/common/StatusChip';
import type { UpdateProfilePayload } from '../../services/customerService';

function RoleIcon({ role }: { role: string }) {
  if (role === 'ADMIN') return <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.7 }} />;
  if (role === 'OWNER') return <StoreOutlinedIcon sx={{ fontSize: 48, color: 'secondary.main', opacity: 0.7 }} />;
  return <AccountCircleOutlinedIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.7 }} />;
}

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  OWNER: 'Chủ quán',
  ADMIN: 'Quản trị viên',
};

function ReadOnlyProfile() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
        Thông tin tài khoản
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <RoleIcon role={currentUser.role} />
          <Typography variant="h6" sx={{ mt: 1, fontWeight: 600 }}>
            {currentUser.fullName}
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <StatusChip status={currentUser.status} size="small" />
          </Box>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <InfoRow label="Email" value={currentUser.email} />
          <InfoRow label="Vai trò" value={ROLE_LABELS[currentUser.role] ?? currentUser.role} />
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          Chỉnh sửa thông tin cá nhân cho tài khoản{' '}
          {ROLE_LABELS[currentUser.role]} chưa được hỗ trợ trong phiên bản này.
        </Alert>
      </Paper>
    </Container>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}

export default function ProfilePage() {
  const { currentUser, customerProfile, refreshMe } = useAuth();
  const { showToast } = useToast();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [saveError, setSaveError] = useState<string | null>(null);

  if (currentUser && currentUser.role !== 'CUSTOMER') {
    return <ReadOnlyProfile />;
  }

  return (
    <CustomerProfileForm
      currentUser={currentUser}
      customerProfile={customerProfile}
      isPending={isPending}
      saveError={saveError}
      setSaveError={setSaveError}
      onSubmit={(payload) => {
        setSaveError(null);
        updateProfile(payload, {
          onSuccess: async () => {
            await refreshMe();
            showToast('Đã lưu thông tin cá nhân.', 'success');
          },
          onError: () => {
            setSaveError(
              'Không thể lưu thông tin. Endpoint chưa được xác nhận với BE — xem TODO trong customerService.ts.',
            );
          },
        });
      }}
    />
  );
}

interface CustomerProfileFormProps {
  currentUser: ReturnType<typeof useAuth>['currentUser'];
  customerProfile: ReturnType<typeof useAuth>['customerProfile'];
  isPending: boolean;
  saveError: string | null;
  setSaveError: (e: string | null) => void;
  onSubmit: (payload: UpdateProfilePayload) => void;
}

function CustomerProfileForm({
  currentUser,
  customerProfile,
  isPending,
  saveError,
  setSaveError,
  onSubmit,
}: CustomerProfileFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: currentUser?.fullName ?? '',
      phone: customerProfile?.phone ?? '',
      preferredCity: customerProfile?.preferredCity ?? '',
      emailNotifications: customerProfile?.emailNotifications ?? false,
      smsNotifications: customerProfile?.smsNotifications ?? false,
    },
  });

  useEffect(() => {
    reset({
      fullName: currentUser?.fullName ?? '',
      phone: customerProfile?.phone ?? '',
      preferredCity: customerProfile?.preferredCity ?? '',
      emailNotifications: customerProfile?.emailNotifications ?? false,
      smsNotifications: customerProfile?.smsNotifications ?? false,
    });
  }, [currentUser, customerProfile, reset]);

  const handleFormSubmit = handleSubmit((values) => {
    if (!isDirty) {
      showToastInForm();
      return;
    }

    const payload: UpdateProfilePayload = {};
    if (dirtyFields.fullName) payload.fullName = values.fullName || undefined;
    if (dirtyFields.phone) payload.phone = values.phone || undefined;
    if (dirtyFields.preferredCity) payload.preferredCity = values.preferredCity || undefined;
    if (dirtyFields.emailNotifications !== undefined) {
      payload.emailNotifications = values.emailNotifications;
    }
    if (dirtyFields.smsNotifications !== undefined) {
      payload.smsNotifications = values.smsNotifications;
    }

    onSubmit(payload);
  });

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
        Thông tin cá nhân
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <form onSubmit={handleFormSubmit} noValidate>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Email"
              value={currentUser?.email ?? ''}
              size="small"
              fullWidth
              disabled
              helperText="Email không thể thay đổi."
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              {...register('fullName')}
              label="Họ tên"
              size="small"
              fullWidth
              error={Boolean(errors.fullName)}
              helperText={errors.fullName?.message}
              disabled={isPending}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              {...register('phone')}
              label="Số điện thoại"
              size="small"
              fullWidth
              error={Boolean(errors.phone)}
              helperText={errors.phone?.message}
              disabled={isPending}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              {...register('preferredCity')}
              label="Thành phố ưu thích"
              placeholder="Hà Nội, TP. HCM…"
              size="small"
              fullWidth
              error={Boolean(errors.preferredCity)}
              helperText={errors.preferredCity?.message}
              disabled={isPending}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Tùy chọn thông báo
              </Typography>
              <Controller
                name="emailNotifications"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={isPending}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Nhận thông báo qua Email
                      </Typography>
                    }
                  />
                )}
              />
              <Controller
                name="smsNotifications"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={isPending}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Nhận thông báo qua SMS
                      </Typography>
                    }
                  />
                )}
              />
            </Box>

            {saveError && (
              <Alert severity="warning" onClose={() => setSaveError(null)}>
                {saveError}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={isPending || !isDirty}
              sx={{ alignSelf: 'flex-end', minWidth: 140 }}
            >
              {isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                'Lưu thay đổi'
              )}
            </Button>

            {!isDirty && (
              <Typography variant="caption" color="text.disabled" align="right">
                Thay đổi ít nhất một thông tin để lưu.
              </Typography>
            )}
          </Box>
        </form>
      </Paper>
    </Container>
  );
}

function showToastInForm() {
}
