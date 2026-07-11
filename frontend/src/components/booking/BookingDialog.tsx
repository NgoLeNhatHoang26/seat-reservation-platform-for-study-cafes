import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EventSeatOutlinedIcon from '@mui/icons-material/EventSeatOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { bookingFormSchema, type BookingFormValues } from '../../schemas/booking.schema';
import { useCreateBooking } from '../../hooks/useBooking';
import { useToast } from '../../hooks/useToast';
import { extractErrorCode, getErrorMessage } from '../../utils/errorMessage';
import { generateIdempotencyKey } from '../../utils/idempotencyKey';
import { toIsoDateTimeFromLocal } from '../../utils/datetime';

/**
 * Formats "YYYY-MM-DDTHH:mm" (or ISO) into "DD/MM/YYYY · HH:mm–HH:mm".
 * Parses the string directly to avoid timezone shift from `new Date()`.
 */
function formatTimePeriod(start: string, end: string): string {
  const [datePart, startTime] = start.split('T');
  const [, endTime] = end.split('T');
  if (!datePart || !startTime || !endTime) return `${start} – ${end}`;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year} · ${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}

function resolveInlineError(code: string | undefined): string | null {
  switch (code) {
    case 'SEAT_ALREADY_BOOKED':
    case 'BOOKING_CONFLICT':
      return 'Ghế này vừa được đặt. Vui lòng đóng và chọn ghế khác.';
    case 'BOOKING_LIMIT_EXCEEDED':
      return 'Bạn đã đạt số lượng đặt chỗ tối đa cho phép.';
    case 'INVALID_TIME_SLOT':
      return 'Khung giờ không hợp lệ với chính sách quán (slot duration hoặc giờ mở cửa).';
    case 'TIME_SLOT_IN_PAST':
      return 'Không thể đặt chỗ trong quá khứ. Vui lòng chọn thời gian khác.';
    default:
      return null;
  }
}

export interface BookingDialogProps {
  open: boolean;
  onClose: () => void;
  cafeId: string;
  seatId: string;
  seatNumber: string;
  startTime: string;
  endTime: string;
  onRefetchAvailability?: () => void;
}

export default function BookingDialog({
  open,
  onClose,
  cafeId,
  seatId,
  seatNumber,
  startTime,
  endTime,
  onRefetchAvailability,
}: BookingDialogProps) {
  const { showToast } = useToast();
  const { mutate: createBooking, isPending } = useCreateBooking();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const idempotencyKeyRef = useRef<string>('');
  const prevOpenRef = useRef(false);

  const [dialogError, setDialogError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { notes: '' },
  });

  const notesValue = watch('notes') ?? '';

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    if (justOpened) {
      idempotencyKeyRef.current = generateIdempotencyKey();
      reset({ notes: '' });
      setDialogError(null);
    }
    prevOpenRef.current = open;
  }, [open, reset]);

  const onSubmit = handleSubmit((values) => {
    setDialogError(null);

    createBooking(
      {
        cafeId,
        seatId,
        startTime: toIsoDateTimeFromLocal(startTime),
        endTime: toIsoDateTimeFromLocal(endTime),
        notes: values.notes || undefined,
        idempotencyKey: idempotencyKeyRef.current,
      },
      {
        onSuccess: (data) => {
          const code = data.booking.bookingCode ?? data.booking.id.slice(-6).toUpperCase();
          showToast(`Đặt chỗ thành công — mã ${code}`, 'success');
          onClose();
        },
        onError: (err) => {
          const errorCode = extractErrorCode(err);

          // BOOKING_TIMEOUT — keep dialog open, same idempotency key for safe retry
          if (errorCode === 'BOOKING_TIMEOUT') {
            showToast('Hệ thống đang bận, vui lòng thử lại.', 'warning');
            return;
          }

          const inline = resolveInlineError(errorCode);
          if (inline) {
            setDialogError(inline);
            if (
              errorCode === 'SEAT_ALREADY_BOOKED' ||
              errorCode === 'BOOKING_CONFLICT'
            ) {
              onRefetchAvailability?.();
            }
            return;
          }

          showToast(getErrorMessage(errorCode), 'error');
        },
      },
    );
  });

  return (
    <Dialog
      open={open}
      onClose={isPending ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="booking-dialog-title"
    >
      <DialogTitle id="booking-dialog-title" sx={{ fontWeight: 700, pb: 1 }}>
        Đặt chỗ
      </DialogTitle>

      <Divider />

      <form onSubmit={onSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, color: 'text.secondary' }}>
            <EventSeatOutlinedIcon fontSize="small" sx={{ mt: 0.15 }} />
            <Box>
              <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                Ghế {seatNumber}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, color: 'text.secondary' }}>
            <ScheduleOutlinedIcon fontSize="small" sx={{ mt: 0.15 }} />
            <Typography variant="body2">
              {formatTimePeriod(startTime, endTime)}
            </Typography>
          </Box>

          <TextField
            {...register('notes')}
            label="Ghi chú (tùy chọn)"
            placeholder="Yêu cầu đặc biệt, lưu ý…"
            multiline
            rows={3}
            fullWidth
            size="small"
            error={Boolean(errors.notes)}
            helperText={
              errors.notes?.message ??
              `${notesValue.length}/500`
            }
            disabled={isPending}
          />

          {dialogError && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setDialogError(null)}>
              {dialogError}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={onClose}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            sx={{ minWidth: 130 }}
          >
            {isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              'Xác nhận đặt'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
