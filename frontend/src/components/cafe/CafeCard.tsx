import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Typography,
} from '@mui/material';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import WeekendOutlinedIcon from '@mui/icons-material/WeekendOutlined';
import { useNavigate } from 'react-router-dom';
import StatusChip from '../common/StatusChip';
import type { CafeListItem } from '../../types/cafe.types';
import { getOptimizedCloudinaryImageUrl } from '../../utils/cloudinary';

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wifi',
  power_outlet: 'Ổ cắm điện',
  quiet_zone: 'Khu yên tĩnh',
  parking: 'Bãi đỗ xe',
  food_menu: 'Thức ăn',
  air_conditioning: 'Điều hòa',
};

function amenityLabel(key: string): string {
  return AMENITY_LABELS[key] ?? key;
}

interface CafeCardProps {
  cafe: CafeListItem;
}

const MAX_VISIBLE_AMENITIES = 3;

export default function CafeCard({ cafe }: CafeCardProps) {
  const navigate = useNavigate();

  const visibleAmenities = cafe.amenities.slice(0, MAX_VISIBLE_AMENITIES);
  const hiddenCount = Math.max(0, cafe.amenities.length - MAX_VISIBLE_AMENITIES);
  const coverImageUrl = getOptimizedCloudinaryImageUrl(cafe.coverImageUrl, {
    width: 640,
    height: 360,
    crop: 'fill',
  });

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/cafes/${cafe.id}`)}
        sx={{ flexGrow: 1, alignItems: 'flex-start', display: 'flex', flexDirection: 'column' }}
      >
        {coverImageUrl ? (
          <CardMedia
            component="img"
            image={coverImageUrl}
            alt={cafe.name}
            sx={{ height: 160, objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: 160,
              bgcolor: 'primary.50',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LocalCafeOutlinedIcon sx={{ fontSize: 48 }} />
          </Box>
        )}
        <CardContent sx={{ width: '100%', flexGrow: 1 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 1,
              mb: 1,
            }}
          >
            <Typography
              variant="subtitle1"
              component="h2"
              sx={{ fontWeight: 700, lineHeight: 1.3, flexGrow: 1 }}
            >
              {cafe.name}
            </Typography>
            <StatusChip status="ACTIVE" size="small" />
          </Box>

          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', mb: 1.5 }}
          >
            <LocationOnOutlinedIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2">{cafe.city}</Typography>
          </Box>

          {cafe.amenities.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
              {visibleAmenities.map((a) => (
                <Chip
                  key={a}
                  label={amenityLabel(a)}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
              {hiddenCount > 0 && (
                <Chip
                  label={`+${hiddenCount}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
          )}

          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
          >
            <WeekendOutlinedIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2">
              {cafe.availableSeatsCount !== undefined
                ? `${cafe.availableSeatsCount} / ${cafe.totalSeats} chỗ trống`
                : `${cafe.totalSeats} chỗ ngồi`}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
