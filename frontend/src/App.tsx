import { Route, Routes } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import CustomerLayout from './layouts/CustomerLayout';
import GuestLayout from './layouts/GuestLayout';
import OwnerLayout from './layouts/OwnerLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import BookingHistoryPage from './pages/booking/BookingHistoryPage';
import BrowseCafesPage from './pages/cafe/BrowseCafesPage';
import CafeDetailPage from './pages/cafe/CafeDetailPage';
import LandingPage from './pages/LandingPage';
import OwnerDashboardPage from './pages/owner/OwnerDashboardPage';
import ProfilePage from './pages/profile/ProfilePage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route element={<GuestLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/cafes" element={<BrowseCafesPage />} />
        <Route path="/cafes/:cafeId" element={<CafeDetailPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
        <Route element={<CustomerLayout />}>
          <Route path="/bookings" element={<BookingHistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['OWNER']} />}>
        <Route element={<OwnerLayout />}>
          <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
