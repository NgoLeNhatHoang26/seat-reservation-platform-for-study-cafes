import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateParams, validateQuery } from '../../middleware/validate';
import * as controller from './notification.controller';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from './notification.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  validateQuery(listNotificationsQuerySchema),
  controller.listNotifications,
);

router.patch(
  '/:notificationId/read',
  authenticate,
  validateParams(notificationIdParamSchema),
  controller.markRead,
);

export default router;
