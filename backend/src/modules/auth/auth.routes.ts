import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { loginRateLimiter, registerRateLimiter } from '../../middleware/rateLimiter';
import { validateBody } from '../../middleware/validate';
import * as controller from './auth.controller';
import {
  loginSchema,
  refreshTokenSchema,
  registerCustomerSchema,
  registerOwnerSchema,
} from './auth.validator';

const router = Router();

router.post(
  '/register',
  registerRateLimiter,
  validateBody(registerCustomerSchema),
  controller.register,
);

router.post(
  '/register-owner',
  registerRateLimiter,
  validateBody(registerOwnerSchema),
  controller.registerOwner,
);

router.post('/login', loginRateLimiter, validateBody(loginSchema), controller.login);

router.post('/refresh', validateBody(refreshTokenSchema), controller.refresh);

router.post(
  '/logout',
  authenticate,
  validateBody(refreshTokenSchema),
  controller.logout,
);

router.get('/me', authenticate, controller.getMe);

export default router;
