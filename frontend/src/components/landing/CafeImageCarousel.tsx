import { useEffect, useState } from 'react';
import { Box, useTheme } from '@mui/material';

export type CafeCarouselImage = {
  src: string;
  fallbackSrc: string;
  alt: string;
};

interface CafeImageCarouselProps {
  images: CafeCarouselImage[];
  intervalMs?: number;
}

export default function CafeImageCarousel({
  images,
  intervalMs = 10000,
}: CafeImageCarouselProps) {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (images.length <= 1 || isPaused) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [images.length, intervalMs, isPaused]);

  return (
    <Box
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: { xs: '4 / 3', md: '11 / 8' },
        minHeight: { xs: 260, sm: 300 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          width: { xs: 140, sm: 180 },
          height: { xs: 140, sm: 180 },
          border: 2,
          borderColor: 'secondary.main',
          borderRadius: '50%',
          top: { xs: -24, md: -38 },
          right: { xs: 20, md: 24, lg: 32 },
          opacity: 0.45,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          width: { xs: 88, sm: 120 },
          height: { xs: 88, sm: 120 },
          border: 2,
          borderColor: 'secondary.main',
          borderRadius: '50%',
          left: { xs: -18, sm: -28 },
          bottom: { xs: 10, sm: 28 },
          opacity: 0.35,
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          borderRadius: {
            xs: '48px 24px 48px 24px',
            md: '80px 32px 96px 32px',
          },
          bgcolor: 'background.paper',
          boxShadow: `0 24px 70px ${theme.palette.primary.main}24`,
          zIndex: 1,
        }}
      >
        {images.map((image, index) => {
          const offset = index - activeIndex;

          return (
            <Box
              component="img"
              key={image.src}
              src={image.src}
              alt={image.alt}
              onError={(event) => {
                const target = event.currentTarget;
                if (target.src !== image.fallbackSrc) {
                  target.src = image.fallbackSrc;
                }
              }}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `translateX(${offset * 100}%)`,
                transition: 'transform 700ms ease',
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}
