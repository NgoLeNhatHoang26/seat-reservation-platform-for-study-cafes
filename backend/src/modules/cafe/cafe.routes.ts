import { Router } from 'express';
import { validateQuery } from '../../middleware/validate';
import * as controller from './cafe.controller';
import {
  availabilityQuerySchema,
  listCafesQuerySchema,
  searchCafesQuerySchema,
} from './cafe.validator';

const router = Router();

router.get('/', validateQuery(listCafesQuerySchema), controller.listCafes);
router.get('/search', validateQuery(searchCafesQuerySchema), controller.searchCafes);
router.get('/:cafeId', controller.getCafeDetail);
router.get('/:cafeId/seats/layout', controller.getSeatLayout);
router.get(
  '/:cafeId/seats/availability',
  validateQuery(availabilityQuerySchema),
  controller.getSeatAvailability,
);

export default router;
