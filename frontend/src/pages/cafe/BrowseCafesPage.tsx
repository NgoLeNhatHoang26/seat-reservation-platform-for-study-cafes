import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  InputAdornment,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import { useCafes } from '../../hooks/useCafes';
import CafeCard from '../../components/cafe/CafeCard';
import EmptyState from '../../components/common/EmptyState';

const AMENITY_OPTIONS = [
  { value: 'wifi', label: 'Wifi' },
  { value: 'power_outlet', label: 'Ổ cắm điện' },
  { value: 'quiet_zone', label: 'Khu yên tĩnh' },
  { value: 'parking', label: 'Bãi đỗ xe' },
  { value: 'food_menu', label: 'Thức ăn' },
  { value: 'air_conditioning', label: 'Điều hòa' },
];

function CafeCardSkeleton() {
  return (
    <Box sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={160} />
      <Box sx={{ p: 1.5 }}>
        <Skeleton width="70%" height={24} />
        <Skeleton width="40%" height={18} sx={{ mt: 0.5 }} />
        <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
          <Skeleton width={60} height={24} sx={{ borderRadius: 3 }} />
          <Skeleton width={70} height={24} sx={{ borderRadius: 3 }} />
        </Box>
      </Box>
    </Box>
  );
}

export default function BrowseCafesPage() {
  const [draftCity, setDraftCity] = useState('');
  const [draftAmenities, setDraftAmenities] = useState<string[]>([]);

  const [appliedCity, setAppliedCity] = useState('');
  const [appliedAmenities, setAppliedAmenities] = useState<string[]>([]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
  } = useCafes({ city: appliedCity, amenities: appliedAmenities });

  const cafes = data?.pages.flatMap((page) => page.items) ?? [];

  const hasFilters = Boolean(appliedCity || appliedAmenities.length);

  const handleSearch = () => {
    setAppliedCity(draftCity.trim());
    setAppliedAmenities(draftAmenities);
  };

  const handleClearFilters = () => {
    setDraftCity('');
    setDraftAmenities([]);
    setAppliedCity('');
    setAppliedAmenities([]);
  };

  const toggleAmenity = (value: string) => {
    setDraftAmenities((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value],
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
        Khám phá quán cà phê
      </Typography>

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 2.5,
          mb: 4,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <TextField
            label="Thành phố"
            placeholder="Hà Nội, TP. HCM…"
            value={draftCity}
            onChange={(e) => setDraftCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            size="small"
            sx={{ minWidth: 220 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{ height: 40, px: 3, whiteSpace: 'nowrap' }}
          >
            Tìm kiếm
          </Button>

          {hasFilters && (
            <Button
              variant="text"
              color="inherit"
              onClick={handleClearFilters}
              sx={{ height: 40, color: 'text.secondary' }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5, lineHeight: '28px' }}>
            Tiện ích:
          </Typography>
          {AMENITY_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              size="small"
              clickable
              color={draftAmenities.includes(opt.value) ? 'primary' : 'default'}
              variant={draftAmenities.includes(opt.value) ? 'filled' : 'outlined'}
              onClick={() => toggleAmenity(opt.value)}
            />
          ))}
        </Box>
        {draftAmenities.length > 0 && !draftCity && (
          <Typography variant="caption" color="warning.main" sx={{ mt: 0.75, display: 'block' }}>
            Cần nhập thành phố để lọc theo tiện ích.
          </Typography>
        )}
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(error as Error).message ?? 'Không thể tải danh sách quán. Vui lòng thử lại.'}
        </Alert>
      )}

      {isLoading && (
        <Grid container spacing={3}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
              <CafeCardSkeleton />
            </Grid>
          ))}
        </Grid>
      )}

      {!isLoading && cafes.length === 0 && !isError && (
        <EmptyState
          icon={<LocalCafeOutlinedIcon />}
          message="Không tìm thấy quán cà phê phù hợp"
          description={
            hasFilters
              ? 'Thử thay đổi thành phố hoặc xóa bớt tiện ích để tìm thêm kết quả.'
              : 'Hiện chưa có quán nào hoạt động.'
          }
          cta={
            hasFilters
              ? { label: 'Xóa bộ lọc', onClick: handleClearFilters }
              : undefined
          }
        />
      )}

      {!isLoading && cafes.length > 0 && (
        <>
          <Grid container spacing={3}>
            {cafes.map((cafe) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={cafe.id}>
                <CafeCard cafe={cafe} />
              </Grid>
            ))}
          </Grid>

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

          {!hasNextPage && cafes.length > 0 && (
            <Typography
              variant="body2"
              color="text.disabled"
              align="center"
              sx={{ mt: 4 }}
            >
              Đã hiển thị tất cả {cafes.length} quán.
            </Typography>
          )}
        </>
      )}
    </Container>
  );
}
