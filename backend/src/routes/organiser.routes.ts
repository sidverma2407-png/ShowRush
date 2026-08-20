import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createEvent,
  updateEvent,
  createShow,
  updateShowPricing,
  getEventSummary,
  getMyEvents
} from '../controllers/organiser.controller';

const router = Router();
const orgAuth = [authenticate, requireRole(['organiser'])];

router.get('/organiser/events', ...orgAuth, getMyEvents);
router.post('/events', ...orgAuth, createEvent);
router.put('/events/:id', ...orgAuth, updateEvent);

router.post('/events/:id/shows', ...orgAuth, createShow);
router.put('/shows/:id/pricing', ...orgAuth, updateShowPricing);

router.get('/events/:id/summary', ...orgAuth, getEventSummary);

export default router;
