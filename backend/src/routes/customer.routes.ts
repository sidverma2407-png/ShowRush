import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getEvents,
  getSeatMap,
  holdSeats,
  releaseHold,
  confirmBooking,
  getMyBookings,
  cancelBooking,
  joinWaitlist,
  viewWaitlistOffer,
  acceptWaitlistOffer
} from '../controllers/customer.controller';

const router = Router();

// Public routes
router.get('/events', getEvents);
router.get('/shows/:id/seats', getSeatMap);
router.get('/waitlist/offer/:token', viewWaitlistOffer);

// Authenticated routes
router.post('/shows/:id/hold', authenticate, holdSeats);
router.delete('/holds/:id', authenticate, releaseHold);
router.post('/bookings', authenticate, confirmBooking);
router.get('/bookings', authenticate, getMyBookings);
router.delete('/bookings/:id', authenticate, cancelBooking);
router.post('/shows/:id/waitlist', authenticate, joinWaitlist);
router.post('/waitlist/offer/:token/accept', authenticate, acceptWaitlistOffer);

export default router;
