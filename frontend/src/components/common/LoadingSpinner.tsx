import { Box, CircularProgress } from '@mui/material';

interface LoadingSpinnerProps {
  fullPage?: boolean;
}

export default function LoadingSpinner({ fullPage = false }: LoadingSpinnerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(fullPage
          ? { position: 'fixed', inset: 0, bgcolor: 'background.default', zIndex: 9999 }
          : { width: '100%', py: 8 }),
      }}
    >
      <CircularProgress color="primary" />
    </Box>
  );
}
