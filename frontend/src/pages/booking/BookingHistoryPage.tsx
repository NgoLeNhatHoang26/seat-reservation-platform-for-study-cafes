import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import EventSeatOutlinedIcon from '@mui/icons-material/EventSeatOutlined';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import { useCancelBooking, useBookings, useCheckIn } from '../../hooks/useBooking';
import { useToast } from '../../hooks/useToast';
import { extractErrorCode, getErrorMessage } from '../../utils/errorMessage';
import StatusChip from '../../components/common/StatusChip';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import type { BookingListItem, BookingStatus } from '../../types/booking.types';

function formatBookingDateTime(startTime: string, endTime: string): string {
  const s = new Date(startTime);
  const e = new Date(endTime);
  const dd = String(s.getDate()).padStart(2, '0');
  const mm = String(s.getMonth() + 1).padStart(2, '0');
  const yyyy = s.getFullYear();
  const sh = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`;
  const eh = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
  return `${dd}/${mm}/${yyyy} · ${sh}–${eh}`;
}

function isInCheckInWindow(startTime: string, graceMinutes = 30): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const graceMs = graceMinutes * 60_000;
  return (
    now >= new Date(start.getTime() - graceMs) &&
    now <= new Date(start.getTime() + graceMs)
  );
}

interface FilterOption {
  label: string;
  status?: BookingStatus;
  upcoming?: boolean;
}

const FILTERS: FilterOption[] = [
  { label: 'Tất cả' },
  { label: 'Sắp tới', upcoming: true },
  { label: 'Hoàn thành', status: 'COMPLETED' },
  { label: 'Đã hủy', status: 'CANCELLED' },
  { label: 'Hết hạn', status: 'EXPIRED' },
];

function BookingCardSkeleton() {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Skeleton width="55%" height={22} />
        <Skeleton width={90} height={24} sx={{ borderRadius: 3 }} />
      </Box>
      <Skeleton width="40%" height={18} sx={{ mb: 0.5 }} />
      <Skeleton width="60%" height={18} sx={{ mb: 1.5 }} />
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Skeleton width={90} height={34} sx={{ borderRadius: 1 }} />
        <Skeleton width={70} height={34} sx={{ borderRadius: 1 }} />
      </Box>
    </Paper>
  );
}

interface BookingCardProps {
  booking: BookingListItem;
  onCancelClick: (bookingId: string) => void;
  onCheckIn: (bookingId: string) => void;
  checkInLoading: boolean;
}

function BookingCard({ booking, onCancelClick, onCheckIn, checkInLoading }: BookingCardProps) {
  const graceMinutes = booking.cafe?.checkinGraceMinutes;
  const showCheckIn =
    booking.status === 'CONFIRMED' && isInCheckInWindow(booking.startTime, graceMinutes);
  const showCancel = booking.status === 'CONFIRMED';

  const displayCode = booking.bookingCode ?? `#${booking.id.slice(-6).toUpperCase()}`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {booking.cafe?.name ?? '—'}
        </Typography>
        <StatusChip status={booking.status} size="small" />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', mb: 0.5 }}>
        <EventSeatOutlinedIcon sx={{ fontSize: 15 }} />
        <Typography variant="body2">
          Ghế {booking.seat?.seatNumber ?? '—'}
          {booking.seat?.zone?.name ? ` · ${booking.seat.zone.name}` : ''}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', mb: 1 }}>
        <CalendarTodayOutlinedIcon sx={{ fontSize: 15 }} />
        <Typography variant="body2">
          {formatBookingDateTime(booking.startTime, booking.endTime)}
        </Typography>
      </Box>

      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
        Mã: {displayCode}
      </Typography>

      {(showCheckIn || showCancel) && (
        <>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {showCheckIn && (
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => onCheckIn(booking.id)}
                disabled={checkInLoading}
                startIcon={checkInLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                Check-in
              </Button>
            )}
            {showCancel && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => onCancelClick(booking.id)}
              >
                Hủy
              </Button>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}

export default function BookingHistoryPage() {
  const { showToast } = useToast();

  const [activeFilter, setActiveFilter] = useState<FilterOption>(FILTERS[0]);

  const [cancelState, setCancelState] = useState<{
    open: boolean;
    bookingId: string | null;
  }>({ open: false, bookingId: null });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
  } = useBookings({
    status: activeFilter.status,
    upcoming: activeFilter.upcoming,
  });

  const bookings = data?.pages.flatMap((p) => p.items) ?? [];

  const { mutate: cancelBooking, isPending: cancelPending } = useCancelBooking();
  const { mutate: checkIn, isPending: checkInPending, variables: checkInVar } = useCheckIn();

  const handleCheckIn = (bookingId: string) => {
    checkIn(bookingId, {
      onSuccess: () => showToast('Check-in thành công!', 'success'),
      onError: (err) => {
        const code = extractErrorCode(err);
        showToast(
          getErrorMessage(code),
          code === 'CHECKIN_TOO_EARLY' ? 'warning' : 'error',
        );
      },
    });
  };

  const handleCancelConfirm = () => {
    if (!cancelState.bookingId) return;
    cancelBooking(
      { bookingId: cancelState.bookingId },
      {
        onSuccess: () => {
          showToast('Đã hủy đặt chỗ.', 'success');
          setCancelState({ open: false, bookingId: null });
        },
        onError: (err) => {
          showToast(getErrorMessage(extractErrorCode(err)), 'error');
          setCancelState({ open: false, bookingId: null });
        },
      },
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
        Lịch sử đặt chỗ
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        {FILTERS.map((f) => {
          const active =
            f.label === activeFilter.label;
          return (
            <Chip
              key={f.label}
              label={f.label}
              clickable
              color={active ? 'primary' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => setActiveFilter(f)}
            />
          );
        })}
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(error as Error).message ?? 'Không thể tải danh sách đặt chỗ.'}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <BookingCardSkeleton key={i} />
          ))}
        </Box>
      )}

      {!isLoading && bookings.length === 0 && !isError && (
        <EmptyState
          icon={<LocalCafeOutlinedIcon />}
          message="Bạn chưa có đặt chỗ nào"
          description={
            activeFilter.label !== 'Tất cả'
              ? `Không có đặt chỗ nào ở mục "${activeFilter.label}".`
              : 'Hãy tìm quán và đặt chỗ ngay!'
          }
          cta={
            activeFilter.label === 'Tất cả'
              ? { label: 'Tìm quán ngay', to: '/cafes' }
              : { label: 'Xem tất cả', onClick: () => setActiveFilter(FILTERS[0]) }
          }
        />
      )}

      {!isLoading && bookings.length > 0 && (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancelClick={(id) => setCancelState({ open: true, bookingId: id })}
                onCheckIn={handleCheckIn}
                checkInLoading={checkInPending && checkInVar === booking.id}
              />
            ))}
          </Box>

          {hasNextPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button
                variant="outlined"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                startIcon={isFetchingNextPage ? <CircularProgress size={16} /> : undefined}
                sx={{ px: 4 }}
              >
                {isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}
              </Button>
            </Box>
          )}

          {!hasNextPage && (
            <Typography
              variant="body2"
              color="text.disabled"
              align="center"
              sx={{ mt: 4 }}
            >
              Đã hiển thị tất cả {bookings.length} đặt chỗ.
            </Typography>
          )}
        </>
      )}

      <ConfirmDialog
        open={cancelState.open}
        title="Hủy đặt chỗ?"
        message="Bạn chắc chắn muốn hủy đặt chỗ này? Hành động này không thể hoàn tác."
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelState({ open: false, bookingId: null })}
        loading={cancelPending}
        confirmLabel="Xác nhận hủy"
        confirmColor="error"
      />
    </Container>
  );
}
