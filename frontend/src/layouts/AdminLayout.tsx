import { useState } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import Navbar from '../components/common/Navbar';
import Sidebar, { type SidebarItem } from '../components/common/Sidebar';

/** Shared via <Outlet context={...}> — consumed by AdminDashboardPage */
export interface AdminTabContext {
  activeTab: number;
  setActiveTab: (tab: number) => void;
}

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Sidebar items all point to the same route; tab switching is driven by
  // activeTab state. `active` overrides pathname-based highlight detection.
  const ADMIN_SIDEBAR_ITEMS: SidebarItem[] = [
    {
      label: 'Tổng quan',
      icon: <DashboardOutlinedIcon />,
      path: '/admin/dashboard',
      active: activeTab === 0,
      onSelect: () => setActiveTab(0),
    },
    {
      label: 'Người dùng',
      icon: <PeopleOutlinedIcon />,
      path: '/admin/dashboard',
      active: activeTab === 1,
      onSelect: () => setActiveTab(1),
    },
    {
      label: 'Duyệt quán',
      icon: <FactCheckOutlinedIcon />,
      path: '/admin/dashboard',
      active: activeTab === 2,
      onSelect: () => setActiveTab(2),
    },
    {
      label: 'Duyệt chủ quán',
      icon: <VerifiedUserOutlinedIcon />,
      path: '/admin/dashboard',
      active: activeTab === 3,
      onSelect: () => setActiveTab(3),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar onMenuClick={() => setDrawerOpen(true)} />

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          items={ADMIN_SIDEBAR_ITEMS}
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
          <Outlet context={{ activeTab, setActiveTab } satisfies AdminTabContext} />
        </Box>
      </Box>
    </Box>
  );
}
