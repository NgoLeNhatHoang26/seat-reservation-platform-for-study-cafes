import { Box, Container } from '@mui/material';
import { Outlet } from 'react-router-dom';
import EmailVerificationBanner from '../components/common/EmailVerificationBanner';
import Navbar from '../components/common/Navbar';

export default function CustomerLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Container component="main" maxWidth="lg" sx={{ flex: 1, py: 3 }}>
        <EmailVerificationBanner />
        <Outlet />
      </Container>
    </Box>
  );
}
