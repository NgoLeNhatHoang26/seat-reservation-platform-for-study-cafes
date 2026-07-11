import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Typography,
} from '@mui/material';
import SeatGrid from '../cafe/SeatGrid';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusChip from '../common/StatusChip';
import { useAdminCafeDetail, useAdminCafeSeatLayout } from '../../hooks/useAdminDashboard';
import { getOptimizedCloudinaryImageUrl } from '../../utils/cloudinary';
import type { SeatGridZone } from '../../types/cafe.types';

interface AdminCafeReviewDialogProps {
  cafeId: string | null;
  cafeName?: string;
  open: boolean;
  onClose: () => void;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Thứ 2',
  tuesday: 'Thứ 3',
  wednesday: 'Thứ 4',
  thursday: 'Thứ 5',
  friday: 'Thứ 6',
  saturday: 'Thứ 7',
  sunday: 'Chủ nhật',
};

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function AdminCafeReviewDialog({
  cafeId,
  cafeName,
  open,
  onClose,
}: AdminCafeReviewDialogProps) {
  const { data: detailData, isLoading: detailLoading } = useAdminCafeDetail(open ? cafeId : null);
  const { data: layoutData, isLoading: layoutLoading } = useAdminCafeSeatLayout(
    open ? cafeId : null,
  );

  const cafe = detailData?.cafe;
  const policies = detailData?.policies;
  const coverImageUrl = getOptimizedCloudinaryImageUrl(cafe?.coverImageUrl, {
    width: 900,
    height: 320,
    crop: 'fill',
  });
  const galleryImages = Array.isArray(cafe?.galleryImages) ? cafe.galleryImages : [];
  const amenities = Array.isArray(cafe?.amenities) ? cafe.amenities : [];

  const seatGridZones: SeatGridZone[] =
    layoutData?.zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      seats: zone.seats.map((seat) => ({
        id: seat.id,
        seatNumber: seat.seatNumber,
      })),
    })) ?? [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Xem trước quán: {cafe?.name ?? cafeName}
      </DialogTitle>
      <DialogContent dividers>
        {detailLoading ? (
          <LoadingSpinner />
        ) : !cafe ? (
          <Typography color="text.secondary">Không tải được thông tin quán.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusChip status={cafe.status} />
              <Typography variant="caption" color="text.disabled">
                Nộp lúc: {new Date(cafe.createdAt).toLocaleString('vi-VN')}
              </Typography>
            </Box>

            {coverImageUrl && (
              <Box
                component="img"
                src={coverImageUrl}
                alt={cafe.name}
                sx={{
                  width: '100%',
                  maxHeight: 240,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            )}

            {galleryImages.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
                {galleryImages.map((imageUrl) => (
                  <Box
                    key={imageUrl}
                    component="img"
                    src={getOptimizedCloudinaryImageUrl(imageUrl, {
                      width: 200,
                      height: 120,
                      crop: 'fill',
                    })}
                    alt={`${cafe.name} gallery`}
                    sx={{
                      width: 120,
                      height: 80,
                      objectFit: 'cover',
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </Box>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Thông tin quán
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {cafe.address}, {cafe.city}
                </Typography>
                {cafe.phone && (
                  <Typography variant="body2" color="text.secondary">
                    Điện thoại: {cafe.phone}
                  </Typography>
                )}
                {cafe.email && (
                  <Typography variant="body2" color="text.secondary">
                    Email: {cafe.email}
                  </Typography>
                )}
                {cafe.description && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {cafe.description}
                  </Typography>
                )}
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Chủ quán
                </Typography>
                <Typography variant="body2">{cafe.owner.fullName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {cafe.owner.email}
                </Typography>
              </Grid>
            </Grid>

            {amenities.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Tiện ích
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {amenities.map((item) => (
                    <Chip key={item} label={item} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}

            {cafe.operatingHours && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Giờ mở cửa
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {Object.entries(cafe.operatingHours).map(([day, hours]) => (
                    <Box
                      key={day}
                      sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
                    >
                      <Typography variant="body2">{DAY_LABELS[day] ?? day}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {hours ? `${hours.open}–${hours.close}` : 'Đóng cửa'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {policies && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Chính sách đặt chỗ
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <PolicyRow
                    label="Thời lượng slot"
                    value={`${policies.slotDurationMinutes} phút`}
                  />
                  <PolicyRow
                    label="Hủy miễn phí trước"
                    value={`${policies.cancellationDeadlineMinutes} phút`}
                  />
                  <PolicyRow
                    label="Tối đa booking cùng lúc"
                    value={`${policies.maxConcurrentBookings} booking`}
                  />
                </Box>
              </Box>
            )}

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Sơ đồ ghế
              </Typography>
              {layoutLoading ? (
                <LoadingSpinner />
              ) : (
                <SeatGrid zones={seatGridZones} onSeatSelect={() => undefined} />
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
