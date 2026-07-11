import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import {
  type OwnerZone,
  type SeatType,
  SEAT_TYPE_OPTIONS,
  SeatType as SeatTypeEnum,
  normalizeSeatType,
  seatTypeLabel,
} from '../../types/cafe.types';
import { useSaveLayout } from '../../hooks/useOwnerDashboard';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../../hooks/useToast';
import { extractErrorCode, getErrorMessage } from '../../utils/errorMessage';

interface SeatState {
  _uid: string;
  id?: string;
  seatNumber: string;
  seatType: SeatType;
  amenities: string[];
  isActive: boolean;
  error?: string;
}

interface ZoneState {
  _uid: string;
  id?: string;
  name: string;
  displayOrder: number;
  seats: SeatState[];
}

let _uidCounter = 0;
function uid() {
  return `_${++_uidCounter}`;
}

function zonesToState(zones: OwnerZone[]): ZoneState[] {
  return zones.map((z, zi) => ({
    _uid: z.id ?? uid(),
    id: z.id,
    name: z.name,
    displayOrder: z.displayOrder ?? zi,
    seats: z.seats.map((s) => ({
      _uid: s.id ?? uid(),
      id: s.id,
      seatNumber: s.seatNumber,
      seatType: normalizeSeatType(s.seatType),
      amenities: s.amenities ?? [],
      isActive: s.isActive ?? true,
    })),
  }));
}

function validateZones(zones: ZoneState[]): ZoneState[] {
  return zones.map((zone) => {
    const seen = new Set<string>();
    return {
      ...zone,
      seats: zone.seats.map((seat) => {
        const key = seat.seatNumber.trim().toLowerCase();
        if (!key) {
          return { ...seat, error: 'Số ghế không được để trống' };
        }
        if (seen.has(key)) {
          return { ...seat, error: 'Số ghế trùng trong zone (DUPLICATE_SEAT_NUMBER)' };
        }
        seen.add(key);
        return { ...seat, error: undefined };
      }),
    };
  });
}

function hasErrors(zones: ZoneState[]) {
  return zones.some((z) => z.seats.some((s) => !!s.error));
}

interface SeatLayoutEditorProps {
  cafeId: string;
  initialZones?: OwnerZone[];
  onSaved?: () => void;
}

interface AddSeatDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (seat: Omit<SeatState, '_uid' | 'id'>) => void;
}

function AddSeatDialog({ open, onClose, onAdd }: AddSeatDialogProps) {
  const [seatNumber, setSeatNumber] = useState('');
  const [seatType, setSeatType] = useState<SeatType>(SeatTypeEnum.STANDARD);

  const handleSubmit = () => {
    if (!seatNumber.trim()) return;
    onAdd({ seatNumber: seatNumber.trim(), seatType, amenities: [], isActive: true });
    setSeatNumber('');
    setSeatType(SeatTypeEnum.STANDARD);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Thêm ghế mới</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <TextField
          label="Số ghế (vd. A-01)"
          value={seatNumber}
          onChange={(e) => setSeatNumber(e.target.value)}
          autoFocus
          fullWidth
          size="small"
        />
        <FormControl fullWidth size="small">
          <InputLabel>Loại ghế</InputLabel>
          <Select
            label="Loại ghế"
            value={seatType}
            onChange={(e) => setSeatType(e.target.value as SeatType)}
          >
            {SEAT_TYPE_OPTIONS.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onClose}>Hủy</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!seatNumber.trim()}>
          Thêm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SeatLayoutEditor({
  cafeId,
  initialZones = [],
  onSaved,
}: SeatLayoutEditorProps) {
  const { showSuccess, showError } = useToast();
  const saveLayoutMutation = useSaveLayout(cafeId);

  const [zones, setZones] = useState<ZoneState[]>(() => zonesToState(initialZones));
  const [selectedZoneUid, setSelectedZoneUid] = useState<string>('');
  const [addSeatOpen, setAddSeatOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);

  useEffect(() => {
    const next = zonesToState(initialZones);
    setZones(next);
    setSelectedZoneUid(next[0]?._uid ?? '');
  }, [initialZones]);

  useEffect(() => {
    if (!zones.find((z) => z._uid === selectedZoneUid) && zones.length > 0) {
      setSelectedZoneUid(zones[0]._uid);
    }
  }, [zones, selectedZoneUid]);

  const selectedZone = zones.find((z) => z._uid === selectedZoneUid) ?? null;

  const addZone = useCallback(() => {
    const newZone: ZoneState = {
      _uid: uid(),
      name: `Zone ${zones.length + 1}`,
      displayOrder: zones.length,
      seats: [],
    };
    setZones((prev) => [...prev, newZone]);
    setSelectedZoneUid(newZone._uid);
  }, [zones.length]);

  const removeZone = useCallback((zoneUid: string) => {
    setZones((prev) => {
      const next = prev.filter((z) => z._uid !== zoneUid);
      return next.map((z, i) => ({ ...z, displayOrder: i }));
    });
  }, []);

  const updateZoneName = useCallback((zoneUid: string, name: string) => {
    setZones((prev) =>
      prev.map((z) => (z._uid === zoneUid ? { ...z, name } : z)),
    );
  }, []);

  const addSeat = useCallback(
    (zoneUid: string, seat: Omit<SeatState, '_uid' | 'id'>) => {
      const newSeat: SeatState = { ...seat, _uid: uid() };
      setZones((prev) =>
        prev.map((z) =>
          z._uid === zoneUid
            ? { ...z, seats: [...z.seats, newSeat] }
            : z,
        ),
      );
    },
    [],
  );

  const removeSeat = useCallback((zoneUid: string, seatUid: string) => {
    setZones((prev) =>
      prev.map((z) =>
        z._uid === zoneUid
          ? { ...z, seats: z.seats.filter((s) => s._uid !== seatUid) }
          : z,
      ),
    );
  }, []);

  const updateSeat = useCallback(
    (zoneUid: string, seatUid: string, patch: Partial<SeatState>) => {
      setZones((prev) =>
        prev.map((z) =>
          z._uid === zoneUid
            ? {
                ...z,
                seats: z.seats.map((s) =>
                  s._uid === seatUid ? { ...s, ...patch, error: undefined } : s,
                ),
              }
            : z,
        ),
      );
    },
    [],
  );

  const buildPayload = (force = false) => ({
    zones: zones.map((z) => ({
      ...(z.id ? { id: z.id } : {}),
      name: z.name,
      displayOrder: z.displayOrder,
      seats: z.seats.map((s) => ({
        ...(s.id ? { id: s.id } : {}),
        seatNumber: s.seatNumber,
        seatType: s.seatType,
        amenities: s.amenities,
        isActive: s.isActive,
      })),
    })),
    force,
  });

  const submitSave = async (force = false) => {
    const validated = validateZones(zones);
    setZones(validated);
    if (hasErrors(validated)) {
      showError('Vui lòng sửa lỗi trùng số ghế trước khi lưu.');
      return;
    }

    if (zones.length === 0) {
      showError('Layout phải có ít nhất 1 zone với 1 ghế.');
      return;
    }

    const payload = buildPayload(force);
    try {
      await saveLayoutMutation.mutateAsync(payload);
      showSuccess('Đã lưu layout thành công.');
      onSaved?.();
    } catch (err) {
      if (extractErrorCode(err) === 'LAYOUT_CONFLICT') {
        setConflictOpen(true);
      } else {
        showError(getErrorMessage(extractErrorCode(err)));
      }
    }
  };

  const handleForceConfirm = async () => {
    setConflictOpen(false);
    await submitSave(true);
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
        Seat Layout Editor
      </Typography>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Zone</InputLabel>
          <Select
            label="Zone"
            value={selectedZoneUid}
            onChange={(e) => setSelectedZoneUid(e.target.value)}
          >
            {zones.map((z) => (
              <MenuItem key={z._uid} value={z._uid}>
                {z.name || '(Chưa đặt tên)'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addZone}
        >
          + Zone mới
        </Button>
      </Stack>

      {selectedZone ? (
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            p: 2,
            mb: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
            <TextField
              label="Tên zone"
              value={selectedZone.name}
              onChange={(e) => updateZoneName(selectedZone._uid, e.target.value)}
              size="small"
              sx={{ flex: 1 }}
            />
            <Tooltip title="Xóa zone này">
              <IconButton
                color="error"
                size="small"
                onClick={() => removeZone(selectedZone._uid)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {selectedZone.seats.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Chưa có ghế nào. Thêm ghế để bắt đầu.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {selectedZone.seats.map((seat) => (
                <SeatCard
                  key={seat._uid}
                  seat={seat}
                  onUpdate={(patch) => updateSeat(selectedZone._uid, seat._uid, patch)}
                  onRemove={() => removeSeat(selectedZone._uid, seat._uid)}
                />
              ))}
            </Box>
          )}

          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddSeatOpen(true)}
          >
            + Ghế mới
          </Button>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Chưa có zone nào. Thêm zone để bắt đầu.
        </Typography>
      )}

      <Button
        variant="contained"
        startIcon={<SaveOutlinedIcon />}
        onClick={() => submitSave(false)}
        disabled={saveLayoutMutation.isPending}
      >
        {saveLayoutMutation.isPending ? 'Đang lưu…' : 'Lưu Layout'}
      </Button>

      <AddSeatDialog
        open={addSeatOpen}
        onClose={() => setAddSeatOpen(false)}
        onAdd={(seat) => selectedZone && addSeat(selectedZone._uid, seat)}
      />

      <ConfirmDialog
        open={conflictOpen}
        title="Xung đột layout"
        message="Một số ghế đang có booking trong tương lai. Xác nhận sẽ hủy các booking này và lưu layout mới."
        confirmLabel="Xác nhận hủy booking & lưu"
        confirmColor="error"
        loading={saveLayoutMutation.isPending}
        onConfirm={handleForceConfirm}
        onCancel={() => setConflictOpen(false)}
      />
    </Box>
  );
}

interface SeatCardProps {
  seat: SeatState;
  onUpdate: (patch: Partial<SeatState>) => void;
  onRemove: () => void;
}

function SeatCard({ seat, onUpdate, onRemove }: SeatCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ seatNumber: seat.seatNumber, seatType: seat.seatType });

  if (!editing) {
    return (
      <Chip
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>{seat.seatNumber}</Typography>
            <Typography variant="caption" color="text.secondary">·{seatTypeLabel(seat.seatType)}</Typography>
            {!seat.isActive && (
              <Typography variant="caption" color="error">(ẩn)</Typography>
            )}
          </Box>
        }
        onClick={() => {
          setDraft({ seatNumber: seat.seatNumber, seatType: seat.seatType });
          setEditing(true);
        }}
        onDelete={onRemove}
        color={seat.error ? 'error' : seat.isActive ? 'default' : 'warning'}
        variant={seat.isActive ? 'outlined' : 'filled'}
        sx={{ height: 'auto', py: 0.5, cursor: 'pointer' }}
      />
    );
  }

  return (
    <Box
      sx={{
        border: 1,
        borderColor: seat.error ? 'error.main' : 'divider',
        borderRadius: 1.5,
        p: 1.5,
        minWidth: 220,
        bgcolor: 'background.paper',
      }}
    >
      <TextField
        label="Số ghế"
        value={draft.seatNumber}
        onChange={(e) => setDraft((d) => ({ ...d, seatNumber: e.target.value }))}
        size="small"
        fullWidth
        error={!!seat.error}
        helperText={seat.error}
        sx={{ mb: 1 }}
      />
      <FormControl size="small" fullWidth sx={{ mb: 1 }}>
        <InputLabel>Loại ghế</InputLabel>
        <Select
          label="Loại ghế"
          value={draft.seatType}
          onChange={(e) => setDraft((d) => ({ ...d, seatType: e.target.value as SeatType }))}
        >
          {SEAT_TYPE_OPTIONS.map((t) => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControlLabel
        control={
          <Switch
            checked={seat.isActive}
            onChange={(e) => onUpdate({ isActive: e.target.checked })}
            size="small"
          />
        }
        label={<Typography variant="caption">Hiển thị</Typography>}
        sx={{ mb: 1 }}
      />
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            onUpdate({ seatNumber: draft.seatNumber.trim(), seatType: draft.seatType });
            setEditing(false);
          }}
        >
          OK
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={() => setEditing(false)}
        >
          Hủy
        </Button>
        <Button size="small" color="error" onClick={onRemove}>
          Xóa
        </Button>
      </Stack>
    </Box>
  );
}
