import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireApprovedOwner } from '../../middleware/requireApprovedOwner';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import { UserRole } from '../../generated/prisma/enums';
import * as controller from './owner.controller';
import {
  cafeBookingParamSchema,
  cafeIdParamSchema,
  createCafeSchema,
  getOwnerSeatLayoutQuerySchema,
  listOwnerCafesQuerySchema,
  ownerCheckInBodySchema,
  updateCafeSchema,
  updateCafeSettingsSchema,
  updateSeatLayoutSchema,
  viewCafeBookingsQuerySchema,
} from './owner.validator';

const router = Router();

router.use(authenticate, authorize(UserRole.OWNER), requireApprovedOwner);

router.post('/', validateBody(createCafeSchema), controller.createCafe);
router.get('/', validateQuery(listOwnerCafesQuerySchema), controller.listOwnerCafes);

router.get(
  '/:cafeId',
  validateParams(cafeIdParamSchema),
  controller.getOwnerCafe,
);
router.put(
  '/:cafeId',
  validateParams(cafeIdParamSchema),
  validateBody(updateCafeSchema),
  controller.updateCafe,
);

router.patch(
  '/:cafeId/settings',
  validateParams(cafeIdParamSchema),
  validateBody(updateCafeSettingsSchema),
  controller.updateCafeSettings,
);

router.get(
  '/:cafeId/seats/layout',
  validateParams(cafeIdParamSchema),
  validateQuery(getOwnerSeatLayoutQuerySchema),
  controller.getOwnerSeatLayout,
);

router.put(
  '/:cafeId/seats/layout',
  validateParams(cafeIdParamSchema),
  validateBody(updateSeatLayoutSchema),
  controller.updateSeatLayout,
);

router.get(
  '/:cafeId/bookings',
  validateParams(cafeIdParamSchema),
  validateQuery(viewCafeBookingsQuerySchema),
  controller.viewCafeBookings,
);

router.post(
  '/:cafeId/bookings/:bookingId/check-in',
  validateParams(cafeBookingParamSchema),
  validateBody(ownerCheckInBodySchema),
  controller.ownerCheckIn,
);

export default router;
