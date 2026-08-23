import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  uploadImage,
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
import {
  getCoupons,
  createCoupon,
  updateCoupon
} from '../controllers/coupons.controller';

const router = Router();
const orgAuth = [authenticate, requireRole(['organiser', 'admin'])];

// Events
router.get('/organiser/events', ...orgAuth, getMyEvents);
router.post('/events', ...orgAuth, createEvent);
router.put('/events/:id', ...orgAuth, updateEvent);
router.delete('/events/:id', ...orgAuth, deleteEvent);

// Image Upload
router.post('/upload', ...orgAuth, uploadImage);

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

// Coupon / Promo code management
router.get('/coupons', ...orgAuth, getCoupons);
router.post('/coupons', ...orgAuth, createCoupon);
router.patch('/coupons/:id', ...orgAuth, updateCoupon);

export default router;
