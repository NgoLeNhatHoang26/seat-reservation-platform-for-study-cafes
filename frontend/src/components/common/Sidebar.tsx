import { type ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';

export interface SidebarItem {
  label: string;
  icon: ReactNode;
  path: string;
  active?: boolean;
  onSelect?: () => void;
}

interface SidebarProps {
  items: SidebarItem[];
  drawerOpen: boolean;
  onDrawerClose: () => void;
}

const SIDEBAR_FULL_WIDTH = 240;
const SIDEBAR_ICON_WIDTH = 72;

function SidebarNavList({
  items,
  collapsed,
  onItemClick,
}: {
  items: SidebarItem[];
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const { pathname } = useLocation();

  return (
    <List sx={{ pt: 1, px: collapsed ? 0.5 : 1 }}>
      {items.map((item) => {
        const isActive =
          item.active !== undefined
            ? item.active
            : pathname === item.path || pathname.startsWith(item.path + '/');

        const handleClick = () => {
          item.onSelect?.();
          onItemClick?.();
        };

        const button = (
          <ListItemButton
            component={RouterLink}
            to={item.path}
            onClick={handleClick}
            selected={isActive}
            sx={{
              borderRadius: 1.5,
              minHeight: 44,
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 1 : 2,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                '&:hover': { bgcolor: 'primary.dark' },
              },
              '&:not(.Mui-selected):hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: collapsed ? 0 : 1.5,
                color: isActive ? 'inherit' : 'text.secondary',
                '& svg': { fontSize: 22 },
              }}
            >
              {item.icon}
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: { variant: 'body2', sx: { fontWeight: isActive ? 600 : 400 } },
                }}
              />
            )}
          </ListItemButton>
        );

        return (
          <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
            {collapsed ? (
              <Tooltip title={item.label} placement="right" arrow>
                {button}
              </Tooltip>
            ) : (
              button
            )}
          </ListItem>
        );
      })}
    </List>
  );
}

function SidebarShell({
  items,
  collapsed,
  onItemClick,
}: {
  items: SidebarItem[];
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  return (
    <Box
      sx={{
        height: '100%',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      <SidebarNavList
        items={items}
        collapsed={collapsed}
        onItemClick={onItemClick}
      />
    </Box>
  );
}

export default function Sidebar({ items, drawerOpen, onDrawerClose }: SidebarProps) {
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const collapsed = isTablet; // icon-only on tablet

  return (
    <>
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          width: collapsed ? SIDEBAR_ICON_WIDTH : SIDEBAR_FULL_WIDTH,
          flexShrink: 0,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <SidebarShell items={items} collapsed={collapsed} />
      </Box>

      {isMobile && (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={onDrawerClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: SIDEBAR_FULL_WIDTH,
              boxSizing: 'border-box',
              mt: '56px', // below AppBar
            },
          }}
        >
          <SidebarShell
            items={items}
            collapsed={false}
            onItemClick={onDrawerClose}
          />
        </Drawer>
      )}
    </>
  );
}
