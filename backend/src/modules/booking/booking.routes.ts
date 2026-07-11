import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { bookingRateLimiter } from '../../middleware/rateLimiter';
import { UserRole } from '../../generated/prisma/enums';
import * as controller from './booking.controller';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate';
import {
  createBookingSchema,
  bookingIdParamSchema,
  cancelBookingQuerySchema,
  checkinBookingBodySchema,
  listBookingsQuerySchema,
} from './booking.validator';


const router = Router();

router.post(
  '/',
  authenticate,
  authorize(UserRole.CUSTOMER),
  bookingRateLimiter,
  validateBody(createBookingSchema),
  controller.createBooking,
);

router.get(
  '/',
  authenticate,
  authorize(UserRole.CUSTOMER),
  validateQuery(listBookingsQuerySchema),
  controller.listBookings,
);

router.get(
  '/:bookingId',
  authenticate,
  authorize(UserRole.CUSTOMER, UserRole.OWNER, UserRole.ADMIN),
  validateParams(bookingIdParamSchema),
  controller.getBooking,
);

router.delete(
  '/:bookingId',
  authenticate,
  authorize(UserRole.CUSTOMER),
  validateParams(bookingIdParamSchema),
  validateQuery(cancelBookingQuerySchema),
  controller.cancelBooking,
);

router.post(
  '/:bookingId/check-in',
  authenticate,
  authorize(UserRole.CUSTOMER),
  validateParams(bookingIdParamSchema),
  validateBody(checkinBookingBodySchema),
  controller.checkIn,
);

export default router;