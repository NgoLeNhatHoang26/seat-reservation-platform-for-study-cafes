import { Box, CircularProgress } from '@mui/material';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  size?: number;
}

export default function LoadingSpinner({ fullPage = false, size }: LoadingSpinnerProps) {
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
      <CircularProgress color="primary" {...(size !== undefined ? { size } : {})} />
    </Box>
  );
}
