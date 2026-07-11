import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CafeImageCarousel, {
  type CafeCarouselImage,
} from '../components/landing/CafeImageCarousel';

const HERO_IMAGES: CafeCarouselImage[] = Array.from({ length: 6 }, (_, index) => {
  const imageNumber = index + 1;
  return {
    src: `/images/landing/cafe-${imageNumber}.jpeg`,
    fallbackSrc: `https://picsum.photos/800/1000?random=${imageNumber}`,
    alt: `Cafe preview ${imageNumber}`,
  };
});

export default function LandingPage() {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: { xs: 'auto', lg: 'calc(100vh - 160px)' },
        display: 'flex',
        alignItems: 'center',
        py: { xs: 4, md: 7, xl: 9 },
        width: { md: '100vw' },
        maxWidth: { md: '100vw' },
        ml: { md: 'calc(50% - 50vw)' },
        mr: { md: 'calc(50% - 50vw)' },
        px: { xs: 0, md: 4, lg: 6 },
      }}
    >
      <Box
        component="section"
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
          gap: { xs: 5, md: 4, lg: 6 },
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: { xs: '100%', md: '48vw' },
              maxWidth: '100%',
              mx: 'auto',
            }}
          >
            <CafeImageCarousel images={HERO_IMAGES} />
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            minWidth: 0,
          }}
        >
          <Stack
            spacing={{ xs: 2, md: 2.5 }}
            sx={{
              width: '100%',
              maxWidth: '100%',
              color: 'text.primary',
            }}
          >
          <Typography
            variant="overline"
            sx={{
              color: 'secondary.main',
              fontWeight: 700,
              letterSpacing: 1.4,
            }}
          >
            Eyebrow label
          </Typography>

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', sm: '3.25rem', md: '3.6rem', lg: '4rem' },
              lineHeight: 1.08,
              color: 'text.primary',
              textWrap: 'balance',
            }}
          >
            Reserve Your Perfect Café Experience
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              lineHeight: 1.35,
              maxWidth: { md: '90%', lg: 480 },
            }}
          >
            Find the perfect café, reserve your favorite seat, and enjoy a seamless coffee experience without waiting.
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.8,
              maxWidth: { md: '90%', lg: 480 },
            }}
          >
            Browse nearby cafés, explore seating layouts, choose your preferred time slot, and confirm your reservation in just a few clicks. Whether you're meeting friends, working remotely, or enjoying a quiet coffee break, we've made café reservations simple and convenient.
          </Typography>

          <Box sx={{ pt: 1 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/cafes')}
              sx={{
                px: 4,
                py: 1.25,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: `0 12px 32px ${theme.palette.primary.main}33`,
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              Đặt ngay
            </Button>
          </Box>
        </Stack>
        </Box>
      </Box>
    </Box>
  );
}
