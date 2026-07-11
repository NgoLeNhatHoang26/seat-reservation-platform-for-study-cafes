import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import type { OwnerCafe } from '../../types/cafe.types';
import { useOwnerCafe, useOwnerSeatLayout } from '../../hooks/useOwnerDashboard';
import CafeInfoForm from './CafeInfoForm';
import CafeSettingsForm from './CafeSettingsForm';
import SeatLayoutEditor from './SeatLayoutEditor';
import StatusChip from '../common/StatusChip';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';

interface CafesPanelProps {
  cafes: OwnerCafe[];
  selectedCafeId: string;
  onCafeSelect: (id: string) => void;
}

export default function CafesPanel({
  cafes,
  selectedCafeId,
  onCafeSelect,
}: CafesPanelProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: cafeDetail, isLoading: detailLoading } = useOwnerCafe(selectedCafeId);
  const { data: layoutData, isLoading: layoutLoading, refetch: refetchLayout } =
    useOwnerSeatLayout(selectedCafeId);

  const selectedCafe = cafes.find((c) => c.id === selectedCafeId);

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Quán & Layout
      </Typography>

      <Stack direction="row" spacing={1.5} sx={{ mb: 3, alignItems: 'center' }}>
        {cafes.length > 0 ? (
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Chọn café</InputLabel>
            <Select
              label="Chọn café"
              value={selectedCafeId}
              onChange={(e) => onCafeSelect(e.target.value)}
            >
              {cafes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StorefrontOutlinedIcon fontSize="small" color="action" />
                    <span>{c.name}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}

        {selectedCafe && (
          <StatusChip status={selectedCafe.status} />
        )}

        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          + Café mới
        </Button>
      </Stack>

      {cafes.length === 0 && (
        <EmptyState
          icon={<StorefrontOutlinedIcon />}
          message="Chưa có quán nào"
          description="Tạo quán đầu tiên của bạn để bắt đầu."
        />
      )}

      {selectedCafeId && (
        <>
          <Accordion defaultExpanded variant="outlined" sx={{ mb: 1.5, borderRadius: '8px !important' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>Thông tin quán</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {detailLoading ? (
                <LoadingSpinner />
              ) : (
                <CafeInfoForm
                  cafeId={selectedCafeId}
                  initialData={cafeDetail?.cafe}
                />
              )}
            </AccordionDetails>
          </Accordion>

          <Accordion variant="outlined" sx={{ mb: 1.5, borderRadius: '8px !important' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>Chính sách đặt chỗ</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {detailLoading ? (
                <LoadingSpinner />
              ) : (
                <CafeSettingsForm
                  cafeId={selectedCafeId}
                  initialPolicies={cafeDetail?.policies}
                />
              )}
            </AccordionDetails>
          </Accordion>

          <Accordion defaultExpanded variant="outlined" sx={{ borderRadius: '8px !important' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>Sơ đồ ghế</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {layoutLoading ? (
                <LoadingSpinner />
              ) : (
                <SeatLayoutEditor
                  key={`${selectedCafeId}-layout`}
                  cafeId={selectedCafeId}
                  initialZones={layoutData?.zones ?? []}
                  onSaved={() => refetchLayout()}
                />
              )}
            </AccordionDetails>
          </Accordion>
        </>
      )}

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Tạo quán mới
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Quán mới sẽ ở trạng thái <strong>PENDING_VERIFICATION</strong> cho đến khi Admin duyệt.
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <CafeInfoForm
            onSaved={(cafe) => {
              setCreateDialogOpen(false);
              onCafeSelect(cafe.id);
            }}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
