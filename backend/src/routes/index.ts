import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import cafeRoutes from '../modules/cafe/cafe.routes';
import ownerRoutes from '../modules/cafe/owner.routes';
import bookingRoutes from '../modules/booking/booking.routes';
import notificationRoutes from '../modules/notification/notification.routes';
import customerRoutes from '../modules/customer/customer.routes';
import adminRoutes from '../modules/admin/admin.routes';
import uploadRoutes from '../modules/upload/upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/cafes', cafeRoutes);
router.use('/owner/cafes', ownerRoutes);
router.use('/bookings', bookingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/customers', customerRoutes);
router.use('/admin', adminRoutes);
router.use('/uploads', uploadRoutes);

export default router;