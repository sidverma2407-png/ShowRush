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
router.use(authenticate);
router.post('/shows/:id/hold', holdSeats);
router.delete('/holds/:id', releaseHold);
router.post('/bookings', confirmBooking);
router.get('/bookings', getMyBookings);
router.delete('/bookings/:id', cancelBooking);
router.post('/shows/:id/waitlist', joinWaitlist);
router.post('/waitlist/offer/:token/accept', acceptWaitlistOffer);

export default router;
