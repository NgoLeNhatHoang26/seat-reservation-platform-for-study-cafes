import { type ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface CtaConfig {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  description?: string;
  cta?: CtaConfig;
}

export default function EmptyState({
  icon,
  message,
  description,
  cta,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2,
        textAlign: 'center',
        color: 'text.secondary',
      }}
    >
      {icon && (
        <Box sx={{ mb: 2, opacity: 0.4, '& svg': { fontSize: 64 } }}>
          {icon}
        </Box>
      )}

      <Typography variant="h6" color="text.primary" sx={{ fontWeight: 500, mb: 0.5 }}>
        {message}
      </Typography>

      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 360 }}>
          {description}
        </Typography>
      )}

      {cta && (
        <Button
          variant="contained"
          {...(cta.to
            ? { component: RouterLink, to: cta.to }
            : { onClick: cta.onClick })}
          sx={{ mt: description ? 0 : 2 }}
        >
          {cta.label}
        </Button>
      )}
    </Box>
  );
}
