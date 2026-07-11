import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import type { OwnerCafe } from '../../types/cafe.types';
import {
  useOwnerBookings,
  useOwnerCheckIn,
} from '../../hooks/useOwnerDashboard';
import StatusChip from '../common/StatusChip';
import EmptyState from '../common/EmptyState';
import { useToast } from '../../hooks/useToast';
import { extractErrorCode, getErrorMessage } from '../../utils/errorMessage';

const BOOKING_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'CHECKED_IN', label: 'Đã check-in' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'EXPIRED', label: 'Hết hạn' },
];

const dateFilterFieldSx = (hasValue: boolean) => ({
  minWidth: 160,
  '& input[type="date"]::-webkit-datetime-edit': {
    opacity: hasValue ? 1 : 0,
  },
  '& input[type="date"]:focus::-webkit-datetime-edit': {
    opacity: 1,
  },
});

interface BookingsPanelProps {
  cafes: OwnerCafe[];
  selectedCafeId: string;
  onCafeSelect: (id: string) => void;
}

export default function BookingsPanel({
  cafes,
  selectedCafeId,
  onCafeSelect,
}: BookingsPanelProps) {
  const { showSuccess, showError } = useToast();

  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const params = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    limit: 20,
  };

  const { data, isLoading, refetch } = useOwnerBookings(selectedCafeId, params);
  const checkInMutation = useOwnerCheckIn(selectedCafeId);

  const bookings = data?.items ?? [];
  const summary = data?.summary;

  const handleCheckIn = async (bookingId: string) => {
    setCheckingInId(bookingId);
    try {
      await checkInMutation.mutateAsync(bookingId);
      showSuccess('Check-in thành công.');
      refetch();
    } catch (err) {
      showError(getErrorMessage(extractErrorCode(err)));
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Danh sách đặt chỗ
      </Typography>

      {cafes.length > 1 && (
        <FormControl size="small" sx={{ minWidth: 240, mb: 2 }}>
          <InputLabel>Chọn café</InputLabel>
          <Select
            label="Chọn café"
            value={selectedCafeId}
            onChange={(e) => onCafeSelect(e.target.value)}
          >
            {cafes.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {!selectedCafeId ? (
        <EmptyState
          icon={<StorefrontOutlinedIcon />}
          message="Chưa có quán nào"
        />
      ) : (
        <>
          {summary && (
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                Tổng: <strong>{summary.total}</strong>
              </Typography>
              <Typography variant="body2" color="success.main">
                Confirmed: <strong>{summary.confirmed}</strong>
              </Typography>
              <Typography variant="body2" color="info.main">
                Checked-in: <strong>{summary.checkedIn}</strong>
              </Typography>
            </Stack>
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ mb: 2, flexWrap: 'wrap' }}
          >
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                label="Trạng thái"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {BOOKING_STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Từ ngày"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={dateFilterFieldSx(Boolean(startDate))}
            />
            <TextField
              label="Đến ngày"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={dateFilterFieldSx(Boolean(endDate))}
            />
            <TextField
              label="Tìm kiếm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              placeholder="Email / mã booking…"
              sx={{ minWidth: 200 }}
            />
          </Stack>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : bookings.length === 0 ? (
            <EmptyState
              icon={<EventBusyOutlinedIcon />}
              message="Không có đặt chỗ nào"
              description="Thử thay đổi bộ lọc để xem kết quả khác."
            />
          ) : (
            <Card variant="outlined">
              {bookings.map((booking, idx) => {
                const isConfirmed = booking.status === 'CONFIRMED';
                const isCheckingIn = checkingInId === booking.id;

                return (
                  <Box key={booking.id}>
                    {idx > 0 && <Divider />}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2,
                        py: 1.5,
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {booking.customer?.maskedEmail ?? '—'}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          {booking.seat
                            ? `${booking.seat.zone?.name ? booking.seat.zone.name + ' · ' : ''}${booking.seat.seatNumber}`
                            : '—'}
                          {' · '}
                          {new Date(booking.startTime).toLocaleString('vi-VN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' – '}
                          {new Date(booking.endTime).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>

                        {booking.bookingCode && (
                          <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                            {booking.bookingCode}
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <StatusChip status={booking.status} />

                        {isConfirmed && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={
                              isCheckingIn ? (
                                <CircularProgress size={14} color="inherit" />
                              ) : (
                                <LoginOutlinedIcon fontSize="small" />
                              )
                            }
                            disabled={isCheckingIn}
                            onClick={() => handleCheckIn(booking.id)}
                          >
                            Check-in
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  </Box>
                );
              })}
            </Card>
          )}

          {data?.pagination.hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button variant="outlined" size="small" onClick={() => refetch()}>
                Tải thêm
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
