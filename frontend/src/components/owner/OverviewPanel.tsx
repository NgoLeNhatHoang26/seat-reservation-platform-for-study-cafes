import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import type { OwnerCafe } from '../../types/cafe.types';
import StatusChip from '../common/StatusChip';
import EmptyState from '../common/EmptyState';

interface OverviewPanelProps {
  cafes: OwnerCafe[];
}

export default function OverviewPanel({ cafes }: OverviewPanelProps) {
  const pendingCount = cafes.filter((c) => c.status === 'PENDING_VERIFICATION').length;
  const activeCount = cafes.filter((c) => c.status === 'ACTIVE').length;

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Tổng quan
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h3" color="primary" sx={{ fontWeight: 700 }}>
              {cafes.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tổng số quán
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h3" color="success.main" sx={{ fontWeight: 700 }}>
              {activeCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Đang hoạt động
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h3" color="warning.main" sx={{ fontWeight: 700 }}>
              {pendingCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Chờ duyệt
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        Danh sách quán
      </Typography>

      {cafes.length === 0 ? (
        <EmptyState
          icon={<StorefrontOutlinedIcon />}
          message="Chưa có quán nào"
          description="Chuyển sang tab Quán & Layout để tạo quán mới."
        />
      ) : (
        <Card variant="outlined">
          {cafes.map((cafe, idx) => (
            <Box key={cafe.id}>
              {idx > 0 && <Divider />}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.5,
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {cafe.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {cafe.city} · {cafe.address}
                  </Typography>
                </Box>
                <StatusChip status={cafe.status} />
              </Box>
            </Box>
          ))}
        </Card>
      )}
    </Box>
  );
}
