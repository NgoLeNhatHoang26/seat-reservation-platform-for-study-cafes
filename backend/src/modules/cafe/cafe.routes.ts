import { Router } from 'express';
import { validateParams, validateQuery } from '../../middleware/validate';
import * as controller from './cafe.controller';
import {
  availabilityQuerySchema,
  listCafesQuerySchema,
  searchCafesQuerySchema,
} from './cafe.validator';
import { cafeIdParamSchema } from './owner.validator';

const router = Router();

router.get('/', validateQuery(listCafesQuerySchema), controller.listCafes);
router.get('/search', validateQuery(searchCafesQuerySchema), controller.searchCafes);
router.get('/:cafeId', validateParams(cafeIdParamSchema), controller.getCafeDetail);
router.get(
  '/:cafeId/seats/layout',
  validateParams(cafeIdParamSchema),
  controller.getSeatLayout,
);
router.get(
  '/:cafeId/seats/availability',
  validateParams(cafeIdParamSchema),
  validateQuery(availabilityQuerySchema),
  controller.getSeatAvailability,
);

export default router;
