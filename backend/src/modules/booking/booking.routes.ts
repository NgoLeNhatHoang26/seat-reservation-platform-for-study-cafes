import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { bookingRateLimiter } from '../../middleware/rateLimiter';
import { validateBody } from '../../middleware/validate';
import { UserRole } from '../../generated/prisma/enums';
import * as controller from './booking.controller';
import { createBookingSchema } from './booking.validator';


const router = Router();

router.post(
  '/',
  authenticate,
  authorize(UserRole.CUSTOMER),
  bookingRateLimiter,
  validateBody(createBookingSchema),
  controller.createBooking,
);

export default router;