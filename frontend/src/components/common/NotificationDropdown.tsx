import { useState } from 'react';
import {
  Badge,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import { useNotificationContext } from '../../contexts/NotificationContext';
import {
  NOTIFICATION_LIST_PARAMS,
  useMarkNotificationRead,
  useNotificationsList,
} from '../../hooks/useNotifications';
import EmptyState from './EmptyState';
import type { Notification } from '../../types/notification.types';

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Hôm qua' : `${days} ngày trước`;
}

function notificationIcon(type: string) {
  switch (type) {
    case 'BOOKING_CONFIRMATION':
      return <CheckCircleOutlineIcon fontSize="small" sx={{ color: 'success.main' }} />;
    case 'BOOKING_REMINDER':
    case 'CHECK_IN_REMINDER':
      return <AccessTimeOutlinedIcon fontSize="small" sx={{ color: 'warning.main' }} />;
    case 'BOOKING_CANCELLATION':
    case 'BOOKING_EXPIRED':
      return <CancelOutlinedIcon fontSize="small" sx={{ color: 'error.main' }} />;
    default:
      return <NotificationsActiveOutlinedIcon fontSize="small" sx={{ color: 'info.main' }} />;
  }
}

interface NotificationRowProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  markingId: string | null;
}

function NotificationRow({ notification, onMarkRead, markingId }: NotificationRowProps) {
  const isMarking = markingId === notification.id;

  return (
    <ListItemButton
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
      sx={{
        alignItems: 'flex-start',
        gap: 1.5,
        py: 1.25,
        px: 2,
        bgcolor: notification.isRead ? 'transparent' : 'action.hover',
        '&:hover': { bgcolor: 'action.selected' },
        cursor: notification.isRead ? 'default' : 'pointer',
      }}
    >
      <Box sx={{ mt: 0.25, flexShrink: 0 }}>
        {notificationIcon(notification.type)}
      </Box>

      <ListItemText
        primary={
          <Typography
            variant="body2"
            sx={{
              fontWeight: notification.isRead ? 400 : 600,
              lineHeight: 1.4,
            }}
          >
            {notification.title}
          </Typography>
        }
        secondary={
          <Box component="span" sx={{ display: 'block' }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.25 }}
            >
              {notification.message}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25, display: 'block' }}>
              {relativeTime(notification.createdAt)}
            </Typography>
          </Box>
        }
        disableTypography
      />

      <Box sx={{ flexShrink: 0, mt: 0.5 }}>
        {isMarking ? (
          <CircularProgress size={10} />
        ) : !notification.isRead ? (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'primary.main',
            }}
          />
        ) : null}
      </Box>
    </ListItemButton>
  );
}

export default function NotificationDropdown() {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const { unreadCount } = useNotificationContext();

  const open = Boolean(anchor);

  const {
    data,
    isLoading,
    isError,
  } = useNotificationsList({ ...NOTIFICATION_LIST_PARAMS, enabled: open });

  const { mutate: markRead, variables: markingId, isPending: isMarking } = useMarkNotificationRead();

  const notifications = data?.items.filter((n) => n.channel === 'IN_APP') ?? [];

  return (
    <>
      <Tooltip title="Thông báo">
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          size="small"
          aria-label="Mở thông báo"
          aria-haspopup="true"
          aria-expanded={open}
        >
          <Badge
            badgeContent={unreadCount > 0 ? unreadCount : undefined}
            color="error"
            max={99}
          >
            <NotificationsNoneOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              width: 380,
              maxHeight: 480,
              mt: 0.5,
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Thông báo
          </Typography>
          {unreadCount > 0 && (
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
              {unreadCount} chưa đọc
            </Typography>
          )}
        </Box>

        <Divider sx={{ flexShrink: 0 }} />

        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {isError && (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="error" align="center">
                Không thể tải thông báo.
              </Typography>
            </Box>
          )}

          {!isLoading && !isError && notifications.length === 0 && (
            <EmptyState
              icon={<NotificationsNoneOutlinedIcon />}
              message="Không có thông báo mới"
            />
          )}

          {!isLoading && !isError && notifications.length > 0 && (
            <List disablePadding>
              {notifications.map((n, idx) => (
                <Box key={n.id}>
                  <NotificationRow
                    notification={n}
                    onMarkRead={(id) => markRead(id)}
                    markingId={isMarking ? (markingId as string) : null}
                  />
                  {idx < notifications.length - 1 && <Divider component="li" />}
                </Box>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
