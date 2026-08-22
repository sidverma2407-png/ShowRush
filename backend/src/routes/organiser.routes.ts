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
import {
  createAddonItem,
  updateAddonItem,
  deleteAddonItem
} from '../controllers/adminAddons.controller';

const router = Router();
const orgAuth = [authenticate, requireRole(['organiser', 'admin'])];

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

// Food & Drinks Add-ons management
router.post('/addons', ...orgAuth, createAddonItem);
router.patch('/addons/:id', ...orgAuth, updateAddonItem);
router.delete('/addons/:id', ...orgAuth, deleteAddonItem);

export default router;
