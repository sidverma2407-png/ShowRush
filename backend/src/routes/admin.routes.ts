import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createVenue,
  updateVenue,
  deleteVenue,
  getVenues,
  createVenueSeats,
  createSeatCategory,
  deleteSeatCategory,
  getSeatCategories
} from '../controllers/admin.controller';

const router = Router();
const adminAuth = [authenticate, requireRole(['admin'])];

router.get('/venues', ...adminAuth, getVenues);
router.post('/venues', ...adminAuth, createVenue);
router.put('/venues/:id', ...adminAuth, updateVenue);
router.delete('/venues/:id', ...adminAuth, deleteVenue);
router.post('/venues/:id/seats', ...adminAuth, createVenueSeats);

router.get('/seat-categories', ...adminAuth, getSeatCategories);
router.post('/seat-categories', ...adminAuth, createSeatCategory);
router.delete('/seat-categories/:id', ...adminAuth, deleteSeatCategory);

export default router;
