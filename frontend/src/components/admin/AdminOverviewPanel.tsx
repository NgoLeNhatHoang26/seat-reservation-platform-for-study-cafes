import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { useAdminPendingCafes, useAdminPendingOwners, useAdminUsers } from '../../hooks/useAdminDashboard';
import EmptyState from '../common/EmptyState';
import StatusChip from '../common/StatusChip';
import LoadingSpinner from '../common/LoadingSpinner';

export default function AdminOverviewPanel() {
  const { data: pendingData, isLoading: pendingLoading } = useAdminPendingCafes({ limit: 5 });
  const { data: pendingOwnersData, isLoading: pendingOwnersLoading } = useAdminPendingOwners({ limit: 5 });
  // Fetch with limit:1 to get pagination.total without loading all rows
  const { data: usersData } = useAdminUsers({ limit: 1 });

  const pendingCafes = pendingData?.items ?? [];
  const pendingCount = pendingData?.pagination.total ?? pendingCafes.length;
  const pendingOwners = pendingOwnersData?.items ?? [];
  const pendingOwnersCount = pendingOwnersData?.pagination.total ?? pendingOwners.length;
  const totalUsers = usersData?.pagination.total;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Tổng quan
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FactCheckOutlinedIcon color="warning" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h3" fontWeight={700} color="warning.main">
                {pendingLoading ? '—' : pendingCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Café chờ duyệt
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FactCheckOutlinedIcon color="warning" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h3" fontWeight={700} color="warning.main">
                {pendingOwnersLoading ? '—' : pendingOwnersCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Chủ quán chờ duyệt
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {totalUsers !== undefined && (
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PeopleOutlinedIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h3" fontWeight={700} color="primary">
                  {totalUsers}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tổng người dùng
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </Stack>

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Café chờ duyệt gần nhất
      </Typography>

      {pendingLoading ? (
        <LoadingSpinner size={24} />
      ) : pendingCafes.length === 0 ? (
        <EmptyState
          icon={<StorefrontOutlinedIcon />}
          message="Không có café nào đang chờ duyệt"
        />
      ) : (
        <Card variant="outlined">
          {pendingCafes.map((cafe, idx) => (
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
                  <Typography variant="body1" fontWeight={600}>
                    {cafe.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {cafe.city}
                    {cafe.owner ? ` · Chủ: ${cafe.owner.fullName}` : ''}
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
