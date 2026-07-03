import { Router } from 'express';
import cafeRoutes from '../modules/cafe/cafe.routes';
import bookingRoutes from '../modules/booking/booking.routes';

const router = Router();

router.use('/cafes', cafeRoutes);
router.use('/bookings', bookingRoutes);

export default router;