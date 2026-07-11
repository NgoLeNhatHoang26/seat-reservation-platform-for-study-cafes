import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  useAdminPendingOwners,
  useApproveOwner,
  useRejectOwner,
} from '../../hooks/useAdminDashboard';
import StatusChip from '../common/StatusChip';
import EmptyState from '../common/EmptyState';
import LoadingSpinner from '../common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { extractErrorCode, getErrorMessage } from '../../utils/errorMessage';
import type { PendingOwner } from '../../types/admin.types';

interface ApproveDialogProps {
  owner: PendingOwner | null;
  onConfirm: (notes?: string) => void;
  onClose: () => void;
  loading: boolean;
}

function ApproveDialog({ owner, onConfirm, onClose, loading }: ApproveDialogProps) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (owner) setNotes('');
  }, [owner?.id]);

  return (
    <Dialog open={!!owner} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Duyệt chủ quán: {owner?.fullName}
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tài khoản sẽ được kích hoạt và chủ quán có thể đăng nhập, tạo quán.
        </Typography>
        <TextField
          label="Ghi chú (tùy chọn)"
          multiline
          minRows={2}
          fullWidth
          size="small"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={() => onConfirm(notes.trim() || undefined)}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />}
        >
          Xác nhận duyệt
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface RejectDialogProps {
  owner: PendingOwner | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  loading: boolean;
}

function RejectDialog({ owner, onConfirm, onClose, loading }: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (owner) {
      setReason('');
      setError('');
    }
  }, [owner?.id]);

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Vui lòng nhập lý do từ chối.');
      return;
    }
    if (trimmed.length < 5) {
      setError('Lý do phải có ít nhất 5 ký tự.');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Dialog open={!!owner} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Từ chối hồ sơ: {owner?.fullName}
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Chủ quán sẽ không thể đăng nhập cho đến khi đăng ký lại.
        </Typography>
        <TextField
          label="Lý do từ chối *"
          multiline
          minRows={3}
          fullWidth
          size="small"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError('');
          }}
          error={!!error}
          helperText={error || `${reason.trim().length} ký tự (bắt buộc)`}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CancelOutlinedIcon />}
        >
          Xác nhận từ chối
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ReviewDialogProps {
  owner: PendingOwner | null;
  onClose: () => void;
}

function ReviewDialog({ owner, onClose }: ReviewDialogProps) {
  if (!owner) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Hồ sơ: {owner.fullName}
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Email: {owner.email}
              {owner.phone ? ` · SĐT: ${owner.phone}` : ''}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Giấy phép kinh doanh
            </Typography>
            <Box
              component="img"
              src={owner.profile.businessLicenseUrl}
              alt="Giấy phép kinh doanh"
              sx={{
                width: '100%',
                maxHeight: 320,
                objectFit: 'contain',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50',
              }}
            />
            <Link href={owner.profile.businessLicenseUrl} target="_blank" rel="noopener noreferrer" variant="caption">
              Mở ảnh gốc
            </Link>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Căn cước công dân
            </Typography>
            <Box
              component="img"
              src={owner.profile.idCardUrl}
              alt="Căn cước công dân"
              sx={{
                width: '100%',
                maxHeight: 320,
                objectFit: 'contain',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50',
              }}
            />
            <Link href={owner.profile.idCardUrl} target="_blank" rel="noopener noreferrer" variant="caption">
              Mở ảnh gốc
            </Link>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function OwnerApprovalsPanel() {
  const { showSuccess, showError } = useToast();
  const { data, isLoading, refetch } = useAdminPendingOwners({ limit: 50 });
  const approveMutation = useApproveOwner();
  const rejectMutation = useRejectOwner();

  const [approveTarget, setApproveTarget] = useState<PendingOwner | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingOwner | null>(null);
  const [reviewTarget, setReviewTarget] = useState<PendingOwner | null>(null);

  const pendingOwners = data?.items ?? [];

  const handleApprove = async (notes?: string) => {
    if (!approveTarget) return;
    try {
      await approveMutation.mutateAsync({ userId: approveTarget.id, payload: { notes } });
      showSuccess(`Đã duyệt chủ quán "${approveTarget.fullName}".`);
      setApproveTarget(null);
      refetch();
    } catch (err) {
      showError(getErrorMessage(extractErrorCode(err)));
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    try {
      await rejectMutation.mutateAsync({ userId: rejectTarget.id, payload: { reason } });
      showSuccess(`Đã từ chối hồ sơ "${rejectTarget.fullName}".`);
      setRejectTarget(null);
      refetch();
    } catch (err) {
      showError(getErrorMessage(extractErrorCode(err)));
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
        Duyệt chủ quán
      </Typography>

      {isLoading ? (
        <LoadingSpinner />
      ) : pendingOwners.length === 0 ? (
        <EmptyState
          icon={<PersonOutlinedIcon />}
          message="Không có hồ sơ chủ quán nào đang chờ duyệt"
          description="Tất cả yêu cầu đã được xử lý."
        />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {pendingOwners.length} hồ sơ đang chờ duyệt
          </Typography>

          <Stack spacing={1.5}>
            {pendingOwners.map((owner) => (
              <Card key={owner.id} variant="outlined" sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {owner.fullName}
                      </Typography>
                      <StatusChip status={owner.profile.verificationStatus} />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      {owner.email}
                      {owner.phone ? ` · ${owner.phone}` : ''}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => setReviewTarget(owner)}
                    >
                      Xem hồ sơ
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleOutlineIcon />}
                      onClick={() => setApproveTarget(owner)}
                    >
                      Duyệt
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<CancelOutlinedIcon />}
                      onClick={() => setRejectTarget(owner)}
                    >
                      Từ chối
                    </Button>
                  </Stack>
                </Box>
              </Card>
            ))}
          </Stack>
        </>
      )}

      <ApproveDialog
        owner={approveTarget}
        onConfirm={handleApprove}
        onClose={() => setApproveTarget(null)}
        loading={approveMutation.isPending}
      />
      <RejectDialog
        owner={rejectTarget}
        onConfirm={handleReject}
        onClose={() => setRejectTarget(null)}
        loading={rejectMutation.isPending}
      />
      {reviewTarget && (
        <ReviewDialog owner={reviewTarget} onClose={() => setReviewTarget(null)} />
      )}
    </Box>
  );
}
