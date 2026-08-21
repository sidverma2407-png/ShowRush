import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createEvent,
  updateEvent,
  createShow,
  updateShowPricing,
  cancelShow,
  getEventSummary,
  getMyEvents,
  getMyVenues,
  createVenue,
  getSeatCategories
} from '../controllers/organiser.controller';

const router = Router();
const orgAuth = [authenticate, requireRole(['organiser'])];

// Events
router.get('/organiser/events', ...orgAuth, getMyEvents);
router.post('/events', ...orgAuth, createEvent);
router.put('/events/:id', ...orgAuth, updateEvent);

// Shows
router.post('/events/:id/shows', ...orgAuth, createShow);
router.put('/shows/:id/pricing', ...orgAuth, updateShowPricing);
router.put('/shows/:id/cancel', ...orgAuth, cancelShow);

// Analytics
router.get('/events/:id/summary', ...orgAuth, getEventSummary);

// Venues
router.get('/organiser/venues', ...orgAuth, getMyVenues);
router.post('/organiser/venues', ...orgAuth, createVenue);

// Seat Categories (shared lookup)
router.get('/seat-categories', authenticate, getSeatCategories);

export default router;
