import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  Divider,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import {
  useCafeDetail,
  useSeatAvailability,
  useSeatLayout,
} from '../../hooks/useCafeDetail';
import { useAuth } from '../../hooks/useAuth';
import StatusChip from '../../components/common/StatusChip';
import SeatGrid from '../../components/cafe/SeatGrid';
import BookingDialog from '../../components/booking/BookingDialog';
import type { SeatGridZone } from '../../types/cafe.types';
import { getOptimizedCloudinaryImageUrl } from '../../utils/cloudinary';
import { toIsoDateTime } from '../../utils/datetime';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function tomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatLocalDate(tomorrow);
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DAY_LABELS: Record<string, string> = {
  monday: 'Thứ 2',
  tuesday: 'Thứ 3',
  wednesday: 'Thứ 4',
  thursday: 'Thứ 5',
  friday: 'Thứ 6',
  saturday: 'Thứ 7',
  sunday: 'Chủ nhật',
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wifi',
  power_outlet: 'Ổ cắm điện',
  quiet_zone: 'Khu yên tĩnh',
  parking: 'Bãi đỗ xe',
  food_menu: 'Thức ăn',
  air_conditioning: 'Điều hòa',
};

function DetailSkeleton() {
  return (
    <Box>
      <Skeleton width={200} height={32} sx={{ mb: 0.5 }} />
      <Skeleton width={300} height={20} sx={{ mb: 0.5 }} />
      <Skeleton width={180} height={20} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 2 }} />
      <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
    </Box>
  );
}

export default function CafeDetailPage() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [selectedDate, setSelectedDate] = useState(tomorrowString());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<{ id: string; number: string } | null>(null);
  const refetchAvailabilityRef = useRef<(() => void) | null>(null);

  const {
    data: detailData,
    isLoading: detailLoading,
    isError: detailError,
  } = useCafeDetail(cafeId);

  const { data: layoutData, isLoading: layoutLoading } = useSeatLayout(cafeId);

  const availabilityParams = useMemo(() => {
    if (!selectedDate || !startTime || !endTime) return null;
    return {
      startTime: toIsoDateTime(selectedDate, startTime),
      endTime: toIsoDateTime(selectedDate, endTime),
    };
  }, [selectedDate, startTime, endTime]);

  const {
    data: availData,
    isFetching: availFetching,
    isError: availError,
    refetch: refetchAvailability,
  } = useSeatAvailability(cafeId, availabilityParams);

  refetchAvailabilityRef.current = () => { void refetchAvailability(); };

  const seatGridZones = useMemo((): SeatGridZone[] => {
    if (!layoutData) return [];

    const availByZone = new Map<string, Map<string, 'AVAILABLE' | 'BOOKED'>>();
    availData?.zones.forEach((zone) => {
      const seatMap = new Map<string, 'AVAILABLE' | 'BOOKED'>();
      zone.seats.forEach((seat) => seatMap.set(seat.id, seat.status));
      availByZone.set(zone.id, seatMap);
    });

    return layoutData.zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      seats: zone.seats.map((seat) => ({
        id: seat.id,
        seatNumber: seat.seatNumber,
        status: availByZone.get(zone.id)?.get(seat.id),
      })),
    }));
  }, [layoutData, availData]);

  const handleSeatSelect = (seatId: string) => {
    if (!isAuthenticated) {
      navigate(`/login?next=/cafes/${cafeId}`);
      return;
    }
    const seatNumber =
      seatGridZones
        .flatMap((z) => z.seats)
        .find((s) => s.id === seatId)?.seatNumber ?? seatId;

    setSelectedSeat({ id: seatId, number: seatNumber });
    setBookingDialogOpen(true);
  };

  const todayKey = DAY_NAMES[new Date().getDay()];
  const cafe = detailData?.cafe;
  const policies = detailData?.policies;
  const todayHours = cafe?.operatingHours?.[todayKey];
  const cafeImages = useMemo(() => {
    const images = [cafe?.coverImageUrl, ...(cafe?.galleryImages ?? [])].filter(Boolean) as string[];
    return Array.from(new Set(images));
  }, [cafe?.coverImageUrl, cafe?.galleryImages]);
  const selectedImageUrl = cafeImages[selectedImageIndex] ?? cafeImages[0];
  const selectedDisplayImageUrl = getOptimizedCloudinaryImageUrl(selectedImageUrl, {
    width: 1200,
    height: 480,
    crop: 'fill',
  });
  const selectedPreviewImageUrl = getOptimizedCloudinaryImageUrl(selectedImageUrl, {
    width: 1800,
    height: 1200,
    crop: 'fit',
  });
  const hasMultipleImages = cafeImages.length > 1;

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [cafeId]);

  const handlePreviousImage = () => {
    if (!hasMultipleImages) return;
    setSelectedImageIndex((current) => (current === 0 ? cafeImages.length - 1 : current - 1));
  };

  const handleNextImage = () => {
    if (!hasMultipleImages) return;
    setSelectedImageIndex((current) => (current === cafeImages.length - 1 ? 0 : current + 1));
  };

  if (detailLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <DetailSkeleton />
      </Container>
    );
  }

  if (detailError || !cafe) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Không tìm thấy quán cà phê. Có thể quán không còn hoạt động hoặc đường dẫn không hợp lệ.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate('/cafes')} size="small" sx={{ mr: 1 }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/cafes')}
        >
          Quay lại danh sách
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          {selectedDisplayImageUrl && (
            <Box sx={{ position: 'relative', mb: 2.5 }}>
              <Box
                component="img"
                src={selectedDisplayImageUrl}
                alt={cafe.name}
                onClick={() => setImagePreviewOpen(true)}
                sx={{
                  width: '100%',
                  height: { xs: 220, md: 320 },
                  objectFit: 'cover',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'zoom-in',
                  display: 'block',
                }}
              />
              <IconButton
                aria-label="Phóng to ảnh"
                onClick={() => setImagePreviewOpen(true)}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  bgcolor: 'rgba(0, 0, 0, 0.48)',
                  color: 'common.white',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.64)' },
                }}
              >
                <ZoomInIcon />
              </IconButton>
              {hasMultipleImages && (
                <>
                  <IconButton
                    aria-label="Ảnh trước"
                    onClick={handlePreviousImage}
                    sx={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'rgba(0, 0, 0, 0.48)',
                      color: 'common.white',
                      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.64)' },
                    }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <IconButton
                    aria-label="Ảnh sau"
                    onClick={handleNextImage}
                    sx={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'rgba(0, 0, 0, 0.48)',
                      color: 'common.white',
                      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.64)' },
                    }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </>
              )}
            </Box>
          )}

          {cafeImages.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mb: 2.5, pb: 0.5 }}>
              {cafeImages.map((imageUrl, index) => (
                <Box
                  key={imageUrl}
                  component="img"
                  src={getOptimizedCloudinaryImageUrl(imageUrl, {
                    width: 320,
                    height: 200,
                    crop: 'fill',
                  })}
                  alt={`${cafe.name} ảnh ${index + 1}`}
                  onClick={() => setSelectedImageIndex(index)}
                  sx={{
                    width: 160,
                    height: 100,
                    objectFit: 'cover',
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: index === selectedImageIndex ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                    flexShrink: 0,
                    opacity: index === selectedImageIndex ? 1 : 0.78,
                    transition: 'border-color 0.2s ease, opacity 0.2s ease',
                    '&:hover': { opacity: 1 },
                  }}
                />
              ))}
            </Box>
          )}

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                {cafe.name}
              </Typography>
              <StatusChip status={cafe.status} />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
                <LocationOnOutlinedIcon fontSize="small" />
                <Typography variant="body2">{cafe.address}, {cafe.city}</Typography>
              </Box>

              {todayHours && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
                  <AccessTimeOutlinedIcon fontSize="small" />
                  <Typography variant="body2">
                    Hôm nay ({DAY_LABELS[todayKey]}): {todayHours.open}–{todayHours.close}
                  </Typography>
                </Box>
              )}

              {cafe.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
                  <PhoneOutlinedIcon fontSize="small" />
                  <Typography variant="body2">{cafe.phone}</Typography>
                </Box>
              )}
            </Box>

            {cafe.amenities.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
                {cafe.amenities.map((a) => (
                  <Chip
                    key={a}
                    label={AMENITY_LABELS[a] ?? a}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Chọn thời gian
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                label="Ngày"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Từ"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Đến"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              {availData?.summary && (
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
                  {availData.summary.available}/{availData.summary.total} chỗ còn trống
                </Typography>
              )}
            </Box>
            {availError && (
              <Alert severity="warning" sx={{ mt: 1.5 }} icon={<InfoOutlinedIcon />}>
                Không thể tải tình trạng chỗ ngồi. Vui lòng thử lại.
              </Alert>
            )}
          </Paper>

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Sơ đồ chỗ ngồi
          </Typography>

          {layoutLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <SeatGrid
              zones={seatGridZones}
              onSeatSelect={handleSeatSelect}
              availabilityLoading={availFetching}
            />
          )}

          {!isAuthenticated && seatGridZones.length > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Đăng nhập để đặt chỗ. Click vào ghế trống sẽ chuyển đến trang đăng nhập.
            </Alert>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          {policies && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, position: 'sticky', top: 80 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Chính sách đặt chỗ
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <PolicyRow
                  label="Hủy miễn phí trước"
                  value={`${policies.cancellationDeadlineMinutes} phút`}
                />
                <PolicyRow
                  label="Tối đa booking cùng lúc"
                  value={`${policies.maxConcurrentBookings} booking`}
                />
                <PolicyRow
                  label="Đặt trước tối đa"
                  value={`${policies.maxAdvanceBookingDays} ngày`}
                />
                <PolicyRow
                  label="Thời gian mỗi slot"
                  value={`${policies.slotDurationMinutes} phút`}
                />
                {policies.checkinGraceMinutes !== undefined && (
                  <PolicyRow
                    label="Grace check-in"
                    value={`${policies.checkinGraceMinutes} phút`}
                  />
                )}
              </Box>

              {cafe.operatingHours && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Giờ mở cửa
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {DAY_NAMES.map((day) => {
                      const hours = cafe.operatingHours?.[day];
                      return (
                        <Box
                          key={day}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            ...(day === todayKey ? { fontWeight: 700, color: 'primary.main' } : {}),
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: day === todayKey ? 700 : 400 }}
                          >
                            {DAY_LABELS[day]}
                          </Typography>
                          <Typography
                            variant="body2"
                            color={day === todayKey ? 'primary.main' : 'text.secondary'}
                            sx={{ fontWeight: day === todayKey ? 700 : 400 }}
                          >
                            {hours ? `${hours.open}–${hours.close}` : 'Đóng cửa'}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>

      {selectedPreviewImageUrl && (
        <Dialog
          open={imagePreviewOpen}
          onClose={() => setImagePreviewOpen(false)}
          maxWidth="lg"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                bgcolor: 'transparent',
                boxShadow: 'none',
                overflow: 'visible',
              },
            },
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <IconButton
              aria-label="Đóng ảnh phóng to"
              onClick={() => setImagePreviewOpen(false)}
              sx={{
                position: 'absolute',
                top: -18,
                right: -18,
                bgcolor: 'rgba(0, 0, 0, 0.72)',
                color: 'common.white',
                zIndex: 1,
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.86)' },
              }}
            >
              <CloseIcon />
            </IconButton>
            <Box
              component="img"
              src={selectedPreviewImageUrl}
              alt={`${cafe.name} phóng to`}
              sx={{
                width: '100%',
                maxHeight: '82vh',
                objectFit: 'contain',
                borderRadius: 2,
                display: 'block',
                bgcolor: 'common.black',
              }}
            />
            {hasMultipleImages && (
              <>
                <IconButton
                  aria-label="Ảnh trước"
                  onClick={handlePreviousImage}
                  sx={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.48)',
                    color: 'common.white',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.64)' },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton
                  aria-label="Ảnh sau"
                  onClick={handleNextImage}
                  sx={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.48)',
                    color: 'common.white',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.64)' },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </>
            )}
          </Box>
        </Dialog>
      )}

      {selectedSeat && cafeId && (
        <BookingDialog
          open={bookingDialogOpen}
          onClose={() => setBookingDialogOpen(false)}
          cafeId={cafeId}
          seatId={selectedSeat.id}
          seatNumber={selectedSeat.number}
          startTime={`${selectedDate}T${startTime}`}
          endTime={`${selectedDate}T${endTime}`}
          onRefetchAvailability={() => refetchAvailabilityRef.current?.()}
        />
      )}
    </Container>
  );
}

interface PolicyRowProps {
  label: string;
  value: string;
  hint?: string;
}

function PolicyRow({ label, value, hint }: PolicyRowProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {hint && (
          <Tooltip title={hint}>
            <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
          </Tooltip>
        )}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}
