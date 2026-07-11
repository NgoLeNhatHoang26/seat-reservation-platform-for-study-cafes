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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { useAdminPendingCafes, useApproveCafe, useRejectCafe } from '../../hooks/useAdminDashboard';
import AdminCafeReviewDialog from './AdminCafeReviewDialog';
import StatusChip from '../common/StatusChip';
import EmptyState from '../common/EmptyState';
import LoadingSpinner from '../common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { extractErrorCode, getErrorMessage } from '../../utils/errorMessage';
import type { PendingCafe } from '../../types/admin.types';

interface ApproveDialogProps {
  cafe: PendingCafe | null;
  onConfirm: (notes?: string) => void;
  onClose: () => void;
  loading: boolean;
}

function ApproveDialog({ cafe, onConfirm, onClose, loading }: ApproveDialogProps) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (cafe) setNotes('');
  }, [cafe?.id]);

  const handleConfirm = () => {
    onConfirm(notes.trim() || undefined);
  };

  return (
    <Dialog open={!!cafe} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Duyệt quán: {cafe?.name}
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Quán sẽ chuyển sang trạng thái{' '}
          <strong>ACTIVE</strong> và xuất hiện trên public listing.
        </Typography>
        <TextField
          label="Ghi chú (tùy chọn)"
          multiline
          minRows={2}
          fullWidth
          size="small"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Nhập ghi chú cho chủ quán…"
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
          onClick={handleConfirm}
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
  cafe: PendingCafe | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  loading: boolean;
}

function RejectDialog({ cafe, onConfirm, onClose, loading }: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cafe) {
      setReason('');
      setError('');
    }
  }, [cafe?.id]);

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
    <Dialog open={!!cafe} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Từ chối quán: {cafe?.name}
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Quán sẽ chuyển sang trạng thái <strong>REJECTED</strong>.
          Chủ quán sẽ nhận được thông báo.
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
          placeholder="Nhập lý do từ chối…"
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

export default function CafeApprovalsPanel() {
  const { showSuccess, showError } = useToast();
  const { data, isLoading, refetch } = useAdminPendingCafes({ limit: 50 });
  const approveMutation = useApproveCafe();
  const rejectMutation = useRejectCafe();

  const [approveTarget, setApproveTarget] = useState<PendingCafe | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingCafe | null>(null);
  const [reviewTarget, setReviewTarget] = useState<PendingCafe | null>(null);

  const pendingCafes = data?.items ?? [];

  const handleApprove = async (notes?: string) => {
    if (!approveTarget) return;
    try {
      await approveMutation.mutateAsync({ cafeId: approveTarget.id, payload: { notes } });
      showSuccess(`Đã duyệt quán "${approveTarget.name}".`);
      setApproveTarget(null);
      refetch();
    } catch (err) {
      showError(getErrorMessage(extractErrorCode(err)));
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    try {
      await rejectMutation.mutateAsync({ cafeId: rejectTarget.id, payload: { reason } });
      showSuccess(`Đã từ chối quán "${rejectTarget.name}".`);
      setRejectTarget(null);
      refetch();
    } catch (err) {
      showError(getErrorMessage(extractErrorCode(err)));
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
        Duyệt quán
      </Typography>

      {isLoading ? (
        <LoadingSpinner />
      ) : pendingCafes.length === 0 ? (
        <EmptyState
          icon={<StorefrontOutlinedIcon />}
          message="Không có quán nào đang chờ duyệt"
          description="Tất cả yêu cầu đã được xử lý."
        />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {pendingCafes.length} quán đang chờ duyệt
          </Typography>

          <Stack spacing={1.5}>
            {pendingCafes.map((cafe) => (
              <Card key={cafe.id} variant="outlined" sx={{ p: 2 }}>
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
                        {cafe.name}
                      </Typography>
                      <StatusChip status={cafe.status} />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      {cafe.city} · {cafe.address}
                    </Typography>

                    {cafe.owner && (
                      <Typography variant="caption" color="text.disabled">
                        Chủ quán: {cafe.owner.fullName} ({cafe.owner.email})
                      </Typography>
                    )}

                    {cafe.amenities && cafe.amenities.length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Tiện ích: {cafe.amenities.join(', ')}
                      </Typography>
                    )}

                    {cafe.createdAt && (
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                        Nộp lúc: {new Date(cafe.createdAt).toLocaleString('vi-VN')}
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => setReviewTarget(cafe)}
                    >
                      Xem chi tiết
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<CheckCircleOutlineIcon />}
                      onClick={() => setApproveTarget(cafe)}
                    >
                      Duyệt
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<CancelOutlinedIcon />}
                      onClick={() => setRejectTarget(cafe)}
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
        cafe={approveTarget}
        onConfirm={handleApprove}
        onClose={() => setApproveTarget(null)}
        loading={approveMutation.isPending}
      />
      <RejectDialog
        cafe={rejectTarget}
        onConfirm={handleReject}
        onClose={() => setRejectTarget(null)}
        loading={rejectMutation.isPending}
      />

      <AdminCafeReviewDialog
        cafeId={reviewTarget?.id ?? null}
        cafeName={reviewTarget?.name}
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
      />

    </Box>
  );
}
