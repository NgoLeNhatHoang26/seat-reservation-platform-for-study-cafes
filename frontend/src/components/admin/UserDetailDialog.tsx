import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import {
  useAdminUserDetail,
  useSuspendUser,
  useUnsuspendUser,
} from '../../hooks/useAdminDashboard';
import { useAuth } from '../../hooks/useAuth';
import StatusChip from '../common/StatusChip';
import LoadingSpinner from '../common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { extractErrorCode, getErrorMessage } from '../../utils/errorMessage';

interface UserDetailDialogProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  OWNER: 'Chủ quán',
  ADMIN: 'Admin',
};

const REASON_MIN = 5;
const REASON_MAX = 500;

export default function UserDetailDialog({
  userId,
  open,
  onClose,
}: UserDetailDialogProps) {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useAdminUserDetail(userId);
  const suspendMutation = useSuspendUser();
  const unsuspendMutation = useUnsuspendUser();

  const [suspendMode, setSuspendMode] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const user = data?.user;

  const canSuspend =
    !!user &&
    user.role !== 'ADMIN' &&
    user.id !== currentUser?.id;

  const isSuspended = user?.status === 'SUSPENDED';

  const handleClose = () => {
    setSuspendMode(false);
    setReason('');
    setReasonError('');
    onClose();
  };

  const handleSuspendSubmit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < REASON_MIN) {
      setReasonError(`Lý do phải có ít nhất ${REASON_MIN} ký tự.`);
      return;
    }
    if (trimmed.length > REASON_MAX) {
      setReasonError(`Lý do không được quá ${REASON_MAX} ký tự.`);
      return;
    }

    try {
      await suspendMutation.mutateAsync({ userId, payload: { reason: trimmed } });
      showSuccess(`Đã đình chỉ tài khoản ${user?.email}.`);
      setSuspendMode(false);
      setReason('');
      handleClose();
    } catch (err) {
      showError(getErrorMessage(extractErrorCode(err)));
    }
  };

  const handleUnsuspend = async () => {
    try {
      await unsuspendMutation.mutateAsync(userId);
      showSuccess(`Đã bỏ đình chỉ tài khoản ${user?.email}.`);
      handleClose();
    } catch (err) {
      showError(getErrorMessage(extractErrorCode(err)));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Chi tiết người dùng
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <LoadingSpinner />
          </Box>
        ) : !user ? (
          <Typography color="text.secondary">Không tìm thấy người dùng.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{user.fullName}</Typography>
                <Typography variant="body2" color="text.secondary">{user.email}</Typography>
              </Box>
              <StatusChip status={user.status} />
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Vai trò</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </Typography>
              </Box>
              {user.role === 'CUSTOMER' && user.bookingCount !== undefined && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Số booking</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.bookingCount}</Typography>
                </Box>
              )}
              {user.role === 'OWNER' && user.cafeCount !== undefined && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Số quán</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.cafeCount}</Typography>
                </Box>
              )}
              {user.createdAt && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Tham gia</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </Typography>
                </Box>
              )}
            </Box>

            {isSuspended && user.suspendedReason && (
              <Box
                sx={{
                  bgcolor: 'error.lighter',
                  border: 1,
                  borderColor: 'error.light',
                  borderRadius: 1,
                  p: 1.5,
                }}
              >
                <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                  Lý do đình chỉ
                </Typography>
                <Typography variant="body2">{user.suspendedReason}</Typography>
              </Box>
            )}

            {suspendMode && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Lý do đình chỉ{' '}
                  <Typography component="span" variant="caption" color="text.secondary">
                    ({REASON_MIN}–{REASON_MAX} ký tự, bắt buộc)
                  </Typography>
                </Typography>
                <TextField
                  multiline
                  minRows={3}
                  fullWidth
                  size="small"
                  placeholder="Nhập lý do đình chỉ…"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (reasonError) setReasonError('');
                  }}
                  error={!!reasonError}
                  helperText={
                    reasonError || `${reason.trim().length}/${REASON_MAX} ký tự`
                  }
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" color="inherit" onClick={handleClose}>
          Đóng
        </Button>

        {user && !suspendMode && (
          <>
            {isSuspended && (
              <Button
                variant="contained"
                color="success"
                onClick={handleUnsuspend}
                disabled={unsuspendMutation.isPending}
                startIcon={
                  unsuspendMutation.isPending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : undefined
                }
              >
                Bỏ đình chỉ
              </Button>
            )}

            {canSuspend && !isSuspended && (
              <Button
                variant="contained"
                color="error"
                onClick={() => setSuspendMode(true)}
              >
                Đình chỉ
              </Button>
            )}
          </>
        )}

        {suspendMode && (
          <>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => {
                setSuspendMode(false);
                setReason('');
                setReasonError('');
              }}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleSuspendSubmit}
              disabled={suspendMutation.isPending}
              startIcon={
                suspendMutation.isPending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              Xác nhận đình chỉ
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
