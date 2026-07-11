import { useOutletContext } from 'react-router-dom';
import { Box } from '@mui/material';
import type { AdminTabContext } from '../../layouts/AdminLayout';
import AdminOverviewPanel from '../../components/admin/AdminOverviewPanel';
import UsersPanel from '../../components/admin/UsersPanel';
import CafeApprovalsPanel from '../../components/admin/CafeApprovalsPanel';
import OwnerApprovalsPanel from '../../components/admin/OwnerApprovalsPanel';

export default function AdminDashboardPage() {
  const { activeTab } = useOutletContext<AdminTabContext>();

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      {activeTab === 0 && <AdminOverviewPanel />}
      {activeTab === 1 && <UsersPanel />}
      {activeTab === 2 && <CafeApprovalsPanel />}
      {activeTab === 3 && <OwnerApprovalsPanel />}
    </Box>
  );
}
