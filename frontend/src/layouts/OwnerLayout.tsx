import { useState } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import Navbar from '../components/common/Navbar';
import Sidebar, { type SidebarItem } from '../components/common/Sidebar';

/** Shared via <Outlet context={...}> — consumed by OwnerDashboardPage */
export interface OwnerTabContext {
  activeTab: number;
  setActiveTab: (tab: number) => void;
}

export default function OwnerLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Sidebar items all point to the same route; tab switching is handled by
  // activeTab state. `active` overrides pathname-based highlight detection so
  const OWNER_SIDEBAR_ITEMS: SidebarItem[] = [
    {
      label: 'Tổng quan',
      icon: <DashboardOutlinedIcon />,
      path: '/owner/dashboard',
      active: activeTab === 0,
      onSelect: () => setActiveTab(0),
    },
    {
      label: 'Quán & Layout',
      icon: <StorefrontOutlinedIcon />,
      path: '/owner/dashboard',
      active: activeTab === 1,
      onSelect: () => setActiveTab(1),
    },
    {
      label: 'Đặt chỗ',
      icon: <EventNoteOutlinedIcon />,
      path: '/owner/dashboard',
      active: activeTab === 2,
      onSelect: () => setActiveTab(2),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar onMenuClick={() => setDrawerOpen(true)} />

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          items={OWNER_SIDEBAR_ITEMS}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
        />

        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            overflow: 'auto',
            minWidth: 0,
          }}
        >
          <Outlet context={{ activeTab, setActiveTab } satisfies OwnerTabContext} />
        </Box>
      </Box>
    </Box>
  );
}
