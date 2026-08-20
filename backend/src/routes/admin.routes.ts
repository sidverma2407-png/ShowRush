import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createVenue,
  updateVenue,
  getVenues,
  createVenueSeats,
  createSeatCategory,
  getSeatCategories
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require admin role
router.use(authenticate, requireRole(['admin']));

router.get('/venues', getVenues);
router.post('/venues', createVenue);
router.put('/venues/:id', updateVenue);
router.post('/venues/:id/seats', createVenueSeats);

router.get('/seat-categories', getSeatCategories);
router.post('/seat-categories', createSeatCategory);

export default router;
