import { Chip, type ChipProps } from '@mui/material';

export type AppStatus =
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'ACTIVE'
  | 'PENDING_EMAIL_VERIFICATION'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

interface StatusConfig {
  label: string;
  color: ChipProps['color'];
}

const STATUS_CONFIG: Record<AppStatus, StatusConfig> = {
  CONFIRMED: { label: 'Đã xác nhận', color: 'success' },
  ACTIVE: { label: 'Hoạt động', color: 'success' },
  CHECKED_IN: { label: 'Đã check-in', color: 'info' },
  COMPLETED: { label: 'Hoàn thành', color: 'secondary' },
  CANCELLED: { label: 'Đã hủy', color: 'error' },
  EXPIRED: { label: 'Hết hạn', color: 'error' },
  SUSPENDED: { label: 'Đình chỉ', color: 'error' },
  REJECTED: { label: 'Từ chối', color: 'error' },
  PENDING_VERIFICATION: { label: 'Chờ duyệt', color: 'warning' },
  PENDING: { label: 'Chờ duyệt', color: 'warning' },
  APPROVED: { label: 'Đã duyệt', color: 'success' },
  PENDING_EMAIL_VERIFICATION: { label: 'Chờ xác minh email', color: 'warning' },
};

interface StatusChipProps {
  status: AppStatus | string;
  size?: ChipProps['size'];
}

export default function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const config = STATUS_CONFIG[status as AppStatus] ?? {
    label: status,
    color: 'default' as ChipProps['color'],
  };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant="filled"
    />
  );
}
