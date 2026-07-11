import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Box } from '@mui/material';
import type { OwnerTabContext } from '../../layouts/OwnerLayout';
import { useOwnerCafes } from '../../hooks/useOwnerDashboard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import OverviewPanel from '../../components/owner/OverviewPanel';
import CafesPanel from '../../components/owner/CafesPanel';
import BookingsPanel from '../../components/owner/BookingsPanel';

export default function OwnerDashboardPage() {
  const { activeTab } = useOutletContext<OwnerTabContext>();

  const [selectedCafeId, setSelectedCafeId] = useState<string>('');

  const { data: cafesData, isLoading: cafesLoading } = useOwnerCafes();
  const cafes = cafesData?.items ?? [];

  useEffect(() => {
    if (cafes.length > 0 && !selectedCafeId) {
      setSelectedCafeId(cafes[0].id);
    }
  }, [cafes, selectedCafeId]);

  if (cafesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <LoadingSpinner />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      {activeTab === 0 && (
        <OverviewPanel cafes={cafes} />
      )}

      {activeTab === 1 && (
        <CafesPanel
          cafes={cafes}
          selectedCafeId={selectedCafeId}
          onCafeSelect={setSelectedCafeId}
        />
      )}

      {activeTab === 2 && (
        <BookingsPanel
          cafes={cafes}
          selectedCafeId={selectedCafeId}
          onCafeSelect={setSelectedCafeId}
        />
      )}
    </Box>
  );
}
