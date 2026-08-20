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
const adminAuth = [authenticate, requireRole(['admin'])];

router.get('/venues', ...adminAuth, getVenues);
router.post('/venues', ...adminAuth, createVenue);
router.put('/venues/:id', ...adminAuth, updateVenue);
router.post('/venues/:id/seats', ...adminAuth, createVenueSeats);

router.get('/seat-categories', ...adminAuth, getSeatCategories);
router.post('/seat-categories', ...adminAuth, createSeatCategory);

export default router;
