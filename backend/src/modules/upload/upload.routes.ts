import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums';
import { registrationUploadRateLimiter } from '../../middleware/rateLimiter';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import * as controller from './upload.controller';
import {
  createCloudinarySignatureSchema,
  registrationUploadSignatureSchema,
} from './upload.validator';

const router = Router();

router.post(
  '/cloudinary/signature/registration',
  registrationUploadRateLimiter,
  validateBody(registrationUploadSignatureSchema),
  controller.createRegistrationCloudinarySignature,
);

router.use(authenticate, authorize(UserRole.OWNER, UserRole.ADMIN));

router.post(
  '/cloudinary/signature',
  validateBody(createCloudinarySignatureSchema),
  controller.createCloudinarySignature,
);

export default router;
