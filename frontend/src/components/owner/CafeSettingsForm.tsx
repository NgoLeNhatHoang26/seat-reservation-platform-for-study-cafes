import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import type { CafePolicies, UpdateCafeSettingsPayload } from '../../types/cafe.types';
import { useUpdateCafeSettings } from '../../hooks/useOwnerDashboard';
import { useToast } from '../../hooks/useToast';
import { extractErrorCode, getErrorMessage } from '../../utils/errorMessage';

interface CafeSettingsFormProps {
  cafeId: string;
  initialPolicies?: CafePolicies;
  onSaved?: (policies: CafePolicies) => void;
}

export default function CafeSettingsForm({
  cafeId,
  initialPolicies,
  onSaved,
}: CafeSettingsFormProps) {
  const { showSuccess, showError } = useToast();
  const updateSettings = useUpdateCafeSettings(cafeId);

  const [slotDuration, setSlotDuration] = useState(
    String(initialPolicies?.slotDurationMinutes ?? 120),
  );
  const [checkinGrace, setCheckinGrace] = useState(
    String(initialPolicies?.checkinGraceMinutes ?? 15),
  );
  const [maxConcurrent, setMaxConcurrent] = useState(
    String(initialPolicies?.maxConcurrentBookings ?? 1),
  );
  const [cancellationDeadline, setCancellationDeadline] = useState(
    String(initialPolicies?.cancellationDeadlineMinutes ?? 60),
  );
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(
    String(initialPolicies?.maxAdvanceBookingDays ?? 30),
  );

  useEffect(() => {
    if (!initialPolicies) return;
    setSlotDuration(String(initialPolicies.slotDurationMinutes ?? 120));
    setCheckinGrace(String(initialPolicies.checkinGraceMinutes ?? 15));
    setMaxConcurrent(String(initialPolicies.maxConcurrentBookings ?? 1));
    setCancellationDeadline(String(initialPolicies.cancellationDeadlineMinutes ?? 60));
    setMaxAdvanceDays(String(initialPolicies.maxAdvanceBookingDays ?? 30));
  }, [initialPolicies]);

  const handleSubmit = async () => {
    const payload: UpdateCafeSettingsPayload = {
      ...(slotDuration ? { slotDurationMinutes: Number(slotDuration) } : {}),
      ...(checkinGrace ? { checkinGraceMinutes: Number(checkinGrace) } : {}),
      ...(maxConcurrent ? { maxConcurrentBookings: Number(maxConcurrent) } : {}),
      ...(cancellationDeadline
        ? { cancellationDeadlineMinutes: Number(cancellationDeadline) }
        : {}),
      ...(maxAdvanceDays ? { maxAdvanceBookingDays: Number(maxAdvanceDays) } : {}),
    };

    try {
      const { policies } = await updateSettings.mutateAsync(payload);
      showSuccess('Đã cập nhật chính sách đặt chỗ.');
      onSaved?.(policies);
    } catch (err) {
      showError(getErrorMessage(extractErrorCode(err)));
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Chính sách áp dụng cho các booking mới.
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Slot thời gian"
            value={slotDuration}
            onChange={(e) => setSlotDuration(e.target.value)}
            type="number"
            size="small"
            fullWidth
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">phút</InputAdornment>,
              },
              htmlInput: { min: 15, max: 480 },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Grace check-in"
            value={checkinGrace}
            onChange={(e) => setCheckinGrace(e.target.value)}
            type="number"
            size="small"
            fullWidth
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">phút</InputAdornment>,
              },
              htmlInput: { min: 0, max: 60 },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Max booking đồng thời"
            value={maxConcurrent}
            onChange={(e) => setMaxConcurrent(e.target.value)}
            type="number"
            size="small"
            fullWidth
            slotProps={{
              htmlInput: { min: 1, max: 20 },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Thời hạn hủy tối thiểu"
            value={cancellationDeadline}
            onChange={(e) => setCancellationDeadline(e.target.value)}
            type="number"
            size="small"
            fullWidth
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">phút</InputAdornment>,
              },
              htmlInput: { min: 0 },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Đặt chỗ trước tối đa"
            value={maxAdvanceDays}
            onChange={(e) => setMaxAdvanceDays(e.target.value)}
            type="number"
            size="small"
            fullWidth
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
              },
              htmlInput: { min: 1, max: 365 },
            }}
          />
        </Grid>
      </Grid>

      <Button
        variant="contained"
        startIcon={<SaveOutlinedIcon />}
        onClick={handleSubmit}
        disabled={updateSettings.isPending}
        sx={{ mt: 2.5 }}
      >
        {updateSettings.isPending ? 'Đang lưu…' : 'Lưu chính sách'}
      </Button>
    </Box>
  );
}
