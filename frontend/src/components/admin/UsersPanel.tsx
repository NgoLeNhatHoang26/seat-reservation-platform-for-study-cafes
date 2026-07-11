import { useState } from 'react';
import {
  Box,
  Card,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAdminUsers } from '../../hooks/useAdminDashboard';
import StatusChip from '../common/StatusChip';
import EmptyState from '../common/EmptyState';
import UserDetailDialog from './UserDetailDialog';

const ROLE_OPTIONS = [
  { value: '', label: 'Tất cả vai trò' },
  { value: 'CUSTOMER', label: 'Khách hàng' },
  { value: 'OWNER', label: 'Chủ quán' },
  { value: 'ADMIN', label: 'Admin' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'PENDING_EMAIL_VERIFICATION', label: 'Chờ xác minh email' },
  { value: 'SUSPENDED', label: 'Đã đình chỉ' },
];

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  OWNER: 'Chủ quán',
  ADMIN: 'Admin',
};

export default function UsersPanel() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  const params = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    limit: 25,
  };

  const { data, isLoading } = useAdminUsers(params);
  const users = data?.items ?? [];

  const openDetail = (userId: string) => {
    setSelectedUserId(userId);
    setDetailOpen(true);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Người dùng
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        <TextField
          label="Tìm kiếm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          placeholder="Tên / email…"
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Vai trò</InputLabel>
          <Select
            label="Vai trò"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            {ROLE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Trạng thái</InputLabel>
          <Select
            label="Trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<PersonSearchOutlinedIcon />}
          message="Không tìm thấy người dùng"
          description="Thử thay đổi bộ lọc để xem kết quả khác."
        />
      ) : (
        <>
          {data?.pagination.total !== undefined && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Tổng: {data.pagination.total} người dùng
            </Typography>
          )}
          <Card variant="outlined">
            {users.map((user, idx) => (
              <Box key={user.id}>
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
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" fontWeight={600} noWrap>
                      {user.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {user.email}{' '}
                      <Typography component="span" variant="caption" color="text.disabled">
                        · {ROLE_LABEL[user.role] ?? user.role}
                      </Typography>
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <StatusChip status={user.status} />
                    <Tooltip title="Xem chi tiết">
                      <IconButton
                        size="small"
                        onClick={() => openDetail(user.id)}
                        color="primary"
                      >
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </Box>
            ))}
          </Card>
        </>
      )}

      {selectedUserId && (
        <UserDetailDialog
          userId={selectedUserId}
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedUserId('');
          }}
        />
      )}
    </Box>
  );
}
