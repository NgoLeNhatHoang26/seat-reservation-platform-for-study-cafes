import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import * as controller from './customer.controller';
import { updateProfileSchema } from './customer.validator';

const router = Router();

router.get(
  '/profile',
  authenticate,
  authorize(UserRole.CUSTOMER),
  controller.getProfile,
);

router.patch(
  '/profile',
  authenticate,
  authorize(UserRole.CUSTOMER),
  validateBody(updateProfileSchema),
  controller.updateProfile,
);

export default router;
