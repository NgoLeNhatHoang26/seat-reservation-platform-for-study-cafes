import { Box, Paper } from '@mui/material';
import { useEffect, type ReactNode } from 'react';

type AuthPageShellProps = {
  children: ReactNode;
  maxWidth?: number;
};

export default function AuthPageShell({ children, maxWidth = 480 }: AuthPageShellProps) {
  useEffect(() => {
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  return (
    <Box
      sx={{
        height: '100dvh',
        maxHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
        py: 2,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100dvh - 32px)',
          overflow: 'hidden',
          p: { xs: 3, sm: 4 },
          borderRadius: 2.5,
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}
