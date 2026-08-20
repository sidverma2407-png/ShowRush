import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createEvent,
  updateEvent,
  createShow,
  updateShowPricing,
  getEventSummary
} from '../controllers/organiser.controller';

const router = Router();

// Organiser routes require organiser or admin role (simplifying to organiser only for strictness, but admin can do too if needed)
router.use(authenticate, requireRole(['organiser']));

router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.post('/events/:id/shows', createShow);
router.put('/shows/:id/pricing', updateShowPricing);
router.get('/events/:id/summary', getEventSummary);

export default router;
