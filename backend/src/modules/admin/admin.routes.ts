import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import * as controller from './admin.controller';
import {
  approveCafeBodySchema,
  approveOwnerBodySchema,
  cafeIdParamSchema,
  listPendingCafesQuerySchema,
  listPendingOwnersQuerySchema,
  listUsersQuerySchema,
  rejectCafeBodySchema,
  rejectOwnerBodySchema,
  suspendUserBodySchema,
  unsuspendUserBodySchema,
  userIdParamSchema,
} from './admin.validator';

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

router.get('/users', validateQuery(listUsersQuerySchema), controller.listUsers);
router.get(
  '/users/:userId',
  validateParams(userIdParamSchema),
  controller.getUserDetail,
);
router.put(
  '/users/:userId/suspend',
  validateParams(userIdParamSchema),
  validateBody(suspendUserBodySchema),
  controller.suspendUser,
);
router.put(
  '/users/:userId/unsuspend',
  validateParams(userIdParamSchema),
  validateBody(unsuspendUserBodySchema),
  controller.unsuspendUser,
);

router.get(
  '/cafes/pending',
  validateQuery(listPendingCafesQuerySchema),
  controller.listPendingCafes,
);
router.get(
  '/cafes/:cafeId',
  validateParams(cafeIdParamSchema),
  controller.getCafeDetail,
);
router.get(
  '/cafes/:cafeId/seats/layout',
  validateParams(cafeIdParamSchema),
  controller.getCafeSeatLayout,
);
router.put(
  '/cafes/:cafeId/approve',
  validateParams(cafeIdParamSchema),
  validateBody(approveCafeBodySchema),
  controller.approveCafe,
);
router.put(
  '/cafes/:cafeId/reject',
  validateParams(cafeIdParamSchema),
  validateBody(rejectCafeBodySchema),
  controller.rejectCafe,
);

router.get(
  '/owners/pending',
  validateQuery(listPendingOwnersQuerySchema),
  controller.listPendingOwners,
);
router.get(
  '/owners/:userId',
  validateParams(userIdParamSchema),
  controller.getOwnerDetail,
);
router.put(
  '/owners/:userId/approve',
  validateParams(userIdParamSchema),
  validateBody(approveOwnerBodySchema),
  controller.approveOwner,
);
router.put(
  '/owners/:userId/reject',
  validateParams(userIdParamSchema),
  validateBody(rejectOwnerBodySchema),
  controller.rejectOwner,
);

export default router;
