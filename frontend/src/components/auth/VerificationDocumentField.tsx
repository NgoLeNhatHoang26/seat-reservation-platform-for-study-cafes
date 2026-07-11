import { useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';

type VerificationDocumentFieldProps = {
  label: string;
  helperText?: string;
  previewUrl: string | null;
  uploading?: boolean;
  error?: string;
  onFileSelect: (file: File | null) => void;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 5;

export default function VerificationDocumentField({
  label,
  helperText,
  previewUrl,
  uploading = false,
  error,
  onFileSelect,
}: VerificationDocumentFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      onFileSelect(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      onFileSelect(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      onFileSelect(null);
      return;
    }

    onFileSelect(file);
    event.target.value = '';
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 600 }}>
        {label}
      </Typography>

      <Box
        sx={{
          border: '1px dashed',
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 2,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: 'background.paper',
        }}
      >
        {previewUrl ? (
          <Box
            component="img"
            src={previewUrl}
            alt={label}
            sx={{
              width: '100%',
              maxHeight: 180,
              objectFit: 'contain',
              borderRadius: 1,
            }}
          />
        ) : (
          <CloudUploadOutlinedIcon sx={{ fontSize: 36, color: 'text.secondary' }} />
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          hidden
          onChange={handleChange}
        />

        <Button
          variant="outlined"
          size="small"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <CircularProgress size={18} />
          ) : previewUrl ? (
            'Chọn ảnh khác'
          ) : (
            'Tải ảnh lên'
          )}
        </Button>
      </Box>

      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
          {helperText}
        </Typography>
      )}

      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
