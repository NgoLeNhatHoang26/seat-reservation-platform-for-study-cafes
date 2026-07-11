import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import type { OperatingHours } from '../../types/auth.types';
import type { OwnerCafe, CreateCafePayload } from '../../types/cafe.types';
import { useUpdateCafe, useCreateCafe } from '../../hooks/useOwnerDashboard';
import { useToast } from '../../hooks/useToast';
import { extractErrorCode, getErrorMessage } from '../../utils/errorMessage';
import { uploadImageToCloudinary } from '../../services/uploadService';
import { getOptimizedCloudinaryImageUrl } from '../../utils/cloudinary';

const AMENITIES_OPTIONS = [
  'WIFI',
  'PARKING',
  'AIR_CONDITIONING',
  'OUTDOOR_SEATING',
  'PET_FRIENDLY',
  'POWER_OUTLETS',
  'QUIET_ZONE',
  'MEETING_ROOM',
  'FOOD_SERVICE',
  'ALCOHOL_SERVICE',
];

const DAYS = [
  { key: 'monday', label: 'Thứ Hai' },
  { key: 'tuesday', label: 'Thứ Ba' },
  { key: 'wednesday', label: 'Thứ Tư' },
  { key: 'thursday', label: 'Thứ Năm' },
  { key: 'friday', label: 'Thứ Sáu' },
  { key: 'saturday', label: 'Thứ Bảy' },
  { key: 'sunday', label: 'Chủ Nhật' },
];

const DEFAULT_HOURS: OperatingHours = Object.fromEntries(
  DAYS.map(({ key }) => [key, { open: '08:00', close: '22:00' }]),
);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface CafeInfoFormProps {
  cafeId?: string;
  initialData?: Partial<OwnerCafe>;
  onSaved?: (cafe: OwnerCafe) => void;
  onCancel?: () => void;
}

export default function CafeInfoForm({
  cafeId,
  initialData,
  onSaved,
  onCancel,
}: CafeInfoFormProps) {
  const { showSuccess, showError } = useToast();
  const updateMutation = useUpdateCafe(cafeId ?? '');
  const createMutation = useCreateCafe();
  const isPending = cafeId ? updateMutation.isPending : createMutation.isPending;

  const [name, setName] = useState(initialData?.name ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [city, setCity] = useState(initialData?.city ?? '');
  const [phone, setPhone] = useState(initialData?.phone ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [amenities, setAmenities] = useState<string[]>(initialData?.amenities ?? []);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    initialData?.coverImageUrl ?? null,
  );
  const [galleryImages, setGalleryImages] = useState<string[]>(initialData?.galleryImages ?? []);
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(
    initialData?.operatingHours ?? DEFAULT_HOURS,
  );

  useEffect(() => {
    setName(initialData?.name ?? '');
    setAddress(initialData?.address ?? '');
    setCity(initialData?.city ?? '');
    setPhone(initialData?.phone ?? '');
    setEmail(initialData?.email ?? '');
    setDescription(initialData?.description ?? '');
    setAmenities(initialData?.amenities ?? []);
    setCoverImageUrl(initialData?.coverImageUrl ?? null);
    setGalleryImages(initialData?.galleryImages ?? []);
    setOperatingHours(initialData?.operatingHours ?? DEFAULT_HOURS);
  }, [initialData]);

  const validateImageFile = (file: File): boolean => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
      return false;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      showError('Ảnh không được vượt quá 5MB.');
      return false;
    }
    return true;
  };

  const uploadFolder = (kind: 'cover' | 'gallery') =>
    `cafes/${cafeId ?? 'drafts'}/${kind}`;

  const buildPublicId = (prefix: string, fileName?: string) => {
    const suffix = fileName
      ?.replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);

    return [prefix, Date.now(), suffix].filter(Boolean).join('-');
  };

  const handleCoverFileChange = async (file: File | undefined) => {
    if (!file || !validateImageFile(file)) return;

    setCoverUploading(true);
    try {
      const uploaded = await uploadImageToCloudinary({
        file,
        folder: uploadFolder('cover'),
        publicId: cafeId ? 'cover' : buildPublicId('cover', file.name),
      });
      setCoverImageUrl(uploaded.url);
      showSuccess('Đã tải ảnh cover lên Cloudinary.');
    } catch {
      showError('Không thể tải ảnh lên Cloudinary. Vui lòng kiểm tra cấu hình.');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleGalleryFilesChange = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    const remainingSlots = Math.max(0, 12 - galleryImages.length);
    const filesToUpload = selectedFiles.slice(0, remainingSlots).filter(validateImageFile);
    if (filesToUpload.length === 0) return;

    setGalleryUploading(true);
    try {
      const uploaded = await Promise.all(
        filesToUpload.map((file) =>
          uploadImageToCloudinary({
            file,
            folder: uploadFolder('gallery'),
            publicId: buildPublicId('gallery', file.name),
          }),
        ),
      );
      setGalleryImages((prev) => [...prev, ...uploaded.map((image) => image.url)]);
      showSuccess('Đã tải ảnh gallery lên Cloudinary.');
    } catch {
      showError('Không thể tải ảnh gallery lên Cloudinary.');
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim() || !city.trim()) {
      showError('Tên, địa chỉ và thành phố là bắt buộc.');
      return;
    }

    const payload: CreateCafePayload = {
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      operatingHours,
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      amenities,
      coverImageUrl,
      galleryImages,
    };

    try {
      if (cafeId) {
        const { cafe } = await updateMutation.mutateAsync(payload);
        showSuccess('Đã cập nhật thông tin quán.');
        onSaved?.(cafe);
      } else {
        const { cafe } = await createMutation.mutateAsync(payload);
        showSuccess('Đã tạo quán mới. Đang chờ Admin duyệt.');
        onSaved?.(cafe);
      }
    } catch (err) {
      showError(getErrorMessage(extractErrorCode(err)));
    }
  };

  const setDayEnabled = (dayKey: string, enabled: boolean) => {
    setOperatingHours((prev) => {
      if (enabled) {
        return { ...prev, [dayKey]: prev[dayKey] ?? { open: '08:00', close: '22:00' } };
      }
      const next = { ...prev };
      delete next[dayKey];
      return next;
    });
  };

  const setDayHours = (dayKey: string, field: 'open' | 'close', value: string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [dayKey]: { ...(prev[dayKey] ?? { open: '08:00', close: '22:00' }), [field]: value },
    }));
  };

  return (
    <Box component="form" noValidate>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Tên quán *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField
            label="Địa chỉ *"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="Thành phố *"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Email liên hệ"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Mô tả"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            size="small"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            Ảnh quán
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box>
              {coverImageUrl && (
                <Box
                  component="img"
                  src={getOptimizedCloudinaryImageUrl(coverImageUrl, {
                    width: 900,
                    height: 360,
                    crop: 'fill',
                  })}
                  alt="Ảnh cover quán"
                  sx={{
                    width: '100%',
                    maxHeight: 220,
                    objectFit: 'cover',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    mb: 1,
                  }}
                />
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={coverUploading ? <CircularProgress size={16} /> : <CloudUploadOutlinedIcon />}
                  disabled={coverUploading}
                >
                  {coverImageUrl ? 'Đổi ảnh cover' : 'Tải ảnh cover'}
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      void handleCoverFileChange(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                </Button>
                {coverImageUrl && (
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setCoverImageUrl(null)}
                  >
                    Xóa cover
                  </Button>
                )}
              </Box>
            </Box>

            <Box>
              {galleryImages.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  {galleryImages.map((imageUrl) => (
                    <Box key={imageUrl} sx={{ position: 'relative' }}>
                      <Box
                        component="img"
                        src={getOptimizedCloudinaryImageUrl(imageUrl, {
                          width: 240,
                          height: 160,
                          crop: 'fill',
                        })}
                        alt="Ảnh gallery quán"
                        sx={{
                          width: 120,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                      <Button
                        size="small"
                        color="error"
                        onClick={() =>
                          setGalleryImages((prev) => prev.filter((url) => url !== imageUrl))
                        }
                        sx={{ minWidth: 0, position: 'absolute', top: 0, right: 0, p: 0.25 }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={galleryUploading ? <CircularProgress size={16} /> : <CloudUploadOutlinedIcon />}
                disabled={galleryUploading || galleryImages.length >= 12}
              >
                Thêm ảnh gallery ({galleryImages.length}/12)
                <input
                  hidden
                  multiple
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    void handleGalleryFilesChange(event.target.files);
                    event.target.value = '';
                  }}
                />
              </Button>
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Tiện ích</InputLabel>
            <Select
              multiple
              value={amenities}
              onChange={(e) => setAmenities(e.target.value as string[])}
              input={<OutlinedInput label="Tiện ích" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((v) => (
                    <Chip key={v} label={v} size="small" />
                  ))}
                </Box>
              )}
            >
              {AMENITIES_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            Giờ mở cửa
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {DAYS.map(({ key, label }) => {
              const enabled = !!operatingHours[key];
              const hours = operatingHours[key];
              return (
                <Box
                  key={key}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={enabled}
                        onChange={(e) => setDayEnabled(key, e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ width: 70 }}>
                        {label}
                      </Typography>
                    }
                    sx={{ m: 0, width: 120 }}
                  />
                  <TextField
                    type="time"
                    value={hours?.open ?? '08:00'}
                    onChange={(e) => setDayHours(key, 'open', e.target.value)}
                    disabled={!enabled}
                    size="small"
                    sx={{ width: 130 }}
                    slotProps={{ htmlInput: { step: 300 } }}
                  />
                  <Typography variant="body2">–</Typography>
                  <TextField
                    type="time"
                    value={hours?.close ?? '22:00'}
                    onChange={(e) => setDayHours(key, 'close', e.target.value)}
                    disabled={!enabled}
                    size="small"
                    sx={{ width: 130 }}
                    slotProps={{ htmlInput: { step: 300 } }}
                  />
                </Box>
              );
            })}
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 1, mt: 2.5 }}>
        <Button
          variant="contained"
          startIcon={<SaveOutlinedIcon />}
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? 'Đang lưu…' : cafeId ? 'Lưu café' : 'Tạo café'}
        </Button>
        {onCancel && (
          <Button variant="outlined" color="inherit" onClick={onCancel}>
            Hủy
          </Button>
        )}
      </Box>
    </Box>
  );
}
