import { Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import type { SeatAvailabilityStatus, SeatGridZone } from '../../types/cafe.types';

interface SeatCellProps {
  id: string;
  seatNumber: string;
  status?: SeatAvailabilityStatus;
  onSelect: (seatId: string) => void;
}

function SeatCell({ id, seatNumber, status, onSelect }: SeatCellProps) {
  const isAvailable = status === 'AVAILABLE';
  const isBooked = status === 'BOOKED';
  const hasStatus = status !== undefined;

  const bgColor = (() => {
    if (!hasStatus) return 'grey.200';
    if (isAvailable) return 'success.light';
    return 'grey.400';
  })();

  const tooltipTitle = (() => {
    if (!hasStatus) return 'Chọn ngày/giờ để xem tình trạng';
    if (isAvailable) return `Ghế ${seatNumber} — Còn trống`;
    return `Ghế ${seatNumber} — Đã đặt`;
  })();

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Box
        component="button"
        onClick={() => isAvailable && onSelect(id)}
        disabled={isBooked || !hasStatus}
        sx={{
          width: 52,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          border: '1px solid',
          borderColor: isAvailable ? 'success.main' : 'grey.300',
          bgcolor: bgColor,
          color: isAvailable ? 'success.dark' : 'text.disabled',
          fontFamily: 'inherit',
          fontSize: '0.72rem',
          fontWeight: 600,
          cursor: isAvailable ? 'pointer' : 'default',
          transition: 'all 0.15s',
          p: 0,
          '&:hover': isAvailable
            ? { bgcolor: 'success.main', color: 'common.white', borderColor: 'success.dark' }
            : {},
          '&:disabled': { cursor: 'default', opacity: 0.7 },
        }}
        aria-label={`Ghế ${seatNumber}${status ? ` — ${status === 'AVAILABLE' ? 'Còn trống' : 'Đã đặt'}` : ''}`}
      >
        {seatNumber}
      </Box>
    </Tooltip>
  );
}

function Legend() {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ width: 14, height: 14, bgcolor: 'success.light', border: '1px solid', borderColor: 'success.main', borderRadius: 0.5 }} />
        <Typography variant="caption" color="text.secondary">Còn trống</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ width: 14, height: 14, bgcolor: 'grey.400', border: '1px solid', borderColor: 'grey.300', borderRadius: 0.5 }} />
        <Typography variant="caption" color="text.secondary">Đã đặt</Typography>
      </Box>
    </Box>
  );
}

interface SeatGridProps {
  zones: SeatGridZone[];
  onSeatSelect: (seatId: string) => void;
  availabilityLoading?: boolean;
}

export default function SeatGrid({ zones, onSeatSelect, availabilityLoading }: SeatGridProps) {
  if (zones.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        Không có thông tin chỗ ngồi.
      </Typography>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {availabilityLoading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            borderRadius: 1,
          }}
        >
          <CircularProgress size={28} />
        </Box>
      )}

      <Legend />

      {zones.map((zone) => (
        <Box key={zone.id} sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            {zone.name}
          </Typography>
          <Box sx={{ overflowX: { xs: 'auto', sm: 'visible' }, pb: { xs: 0.5, sm: 0 } }}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: { xs: 'nowrap', sm: 'wrap' },
                gap: 0.75,
                width: { xs: 'max-content', sm: 'auto' },
              }}
            >
              {zone.seats.map((seat) => (
                <SeatCell
                  key={seat.id}
                  id={seat.id}
                  seatNumber={seat.seatNumber}
                  status={seat.status}
                  onSelect={onSeatSelect}
                />
              ))}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
