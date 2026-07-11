import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Link,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import { useAuth } from '../../hooks/useAuth';
import NotificationDropdown from './NotificationDropdown';

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);

  const openUserMenu = (e: React.MouseEvent<HTMLElement>) =>
    setUserMenuAnchor(e.currentTarget);
  const closeUserMenu = () => setUserMenuAnchor(null);

  const handleLogout = async () => {
    closeUserMenu();
    await logout();
    navigate('/', { replace: true });
  };

  const homeHref =
    currentUser?.role === 'OWNER'
      ? '/owner/dashboard'
      : currentUser?.role === 'ADMIN'
        ? '/admin/dashboard'
        : '/';

  const initials = currentUser?.fullName
    ? currentUser.fullName
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        zIndex: (t) => t.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
        {onMenuClick && (
          <IconButton
            edge="start"
            aria-label="Mở menu"
            onClick={onMenuClick}
            sx={{ display: { md: 'none' }, mr: 0.5 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Link
          component={RouterLink}
          to={homeHref}
          underline="none"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
        >
          <Typography
            variant="h6"
            color="primary"
            sx={{ fontWeight: 700, letterSpacing: '-0.3px' }}
          >
            Study Café
          </Typography>
        </Link>

        {(!currentUser || currentUser.role === 'CUSTOMER') && (
          <Box
            component="nav"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 0.5,
              ml: 2,
            }}
          >
            <Button
              component={RouterLink}
              to="/cafes"
              color="inherit"
              size="small"
            >
              Browse Cafés
            </Button>

            {currentUser?.role === 'CUSTOMER' && (
              <Button
                component={RouterLink}
                to="/bookings"
                color="inherit"
                size="small"
              >
                Đặt chỗ của tôi
              </Button>
            )}
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {isAuthenticated ? (
          <>
            <NotificationDropdown />

            <Tooltip title={currentUser?.fullName ?? 'Tài khoản'}>
              <IconButton
                onClick={openUserMenu}
                size="small"
                aria-label="Tài khoản"
                aria-controls={userMenuAnchor ? 'user-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={!!userMenuAnchor}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'primary.main',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {initials || <AccountCircleOutlinedIcon fontSize="small" />}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              id="user-menu"
              anchorEl={userMenuAnchor}
              open={!!userMenuAnchor}
              onClose={closeUserMenu}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: { sx: { minWidth: 180, mt: 0.5 } },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {currentUser?.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentUser?.email}
                </Typography>
              </Box>

              <Divider />

              {currentUser?.role === 'CUSTOMER' && (
                <MenuItem
                  onClick={() => {
                    closeUserMenu();
                    navigate('/profile');
                  }}
                >
                  <ListItemIcon>
                    <PersonOutlineIcon fontSize="small" />
                  </ListItemIcon>
                  Trang cá nhân
                </MenuItem>
              )}

              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutOutlinedIcon fontSize="small" />
                </ListItemIcon>
                Đăng xuất
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              size="small"
              color="primary"
            >
              Đăng nhập
            </Button>
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              size="small"
              color="primary"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Đăng ký
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
