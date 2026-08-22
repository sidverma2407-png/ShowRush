import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { io } from '../index';
import { sendBookingEmail, sendWaitlistOfferEmail } from '../utils/email';

export const getEvents = async (req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    include: { shows: { include: { venue: true } } }
  });
  res.json({ status: 'success', data: events });
};

export const getSeatMap = async (req: Request, res: Response) => {
  const show_id = req.params.id as string;
  const showDetails = await prisma.show.findUnique({
    where: { id: show_id },
    include: { pricing: { include: { category: true } }, event: true, venue: true }
  });
  
  const seatStatuses = await prisma.seatStatus.findMany({
    where: { show_id },
    include: { venue_seat: { include: { category: true } } }
  });
  
  res.json({ status: 'success', data: { seats: seatStatuses, pricing: showDetails?.pricing || [], show: showDetails } });
};

export const holdSeats = async (req: AuthRequest, res: Response) => {
  const show_id = req.params.id as string;
  const { seat_ids } = req.body;
  if (!Array.isArray(seat_ids) || seat_ids.length === 0) throw new BadRequestError('seat_ids array required');

  const holdTTL = Number(process.env.HOLD_TTL_MINUTES) || 10;
  const expiresAt = new Date(Date.now() + holdTTL * 60000);

  const updatedSeats = await prisma.$transaction(async (tx) => {
    const idsString = seat_ids.map(id => `'${id}'`).join(',');
    const seats = await tx.$queryRawUnsafe<any[]>(
      `SELECT * FROM seat_status WHERE id IN (${idsString}) AND show_id = $1 FOR UPDATE`,
      show_id
    );
    if (seats.length !== seat_ids.length) throw new NotFoundError('One or more seats not found');

    const now = new Date();
    for (const seat of seats) {
      if (seat.status === 'booked') throw new ConflictError('Seat already booked');
      if (seat.status === 'held' && seat.hold_expires_at && new Date(seat.hold_expires_at) > now) {
        if (seat.held_by !== req.user!.id) throw new ConflictError('Seat is currently held by someone else');
      }
    }

    await tx.seatStatus.updateMany({
      where: { id: { in: seat_ids } },
      data: { status: 'held', held_by: req.user!.id, hold_expires_at: expiresAt }
    });

    return tx.seatStatus.findMany({
      where: { id: { in: seat_ids } },
      include: { venue_seat: true }
    });
  });

  updatedSeats.forEach(seat => io.to(show_id).emit('seat_status_updated', seat));
  res.json({ status: 'success', data: updatedSeats });
};

export const confirmBooking = async (req: AuthRequest, res: Response) => {
  const { show_id, seat_status_ids, customer_name, customer_phone } = req.body;
  if (!show_id || !Array.isArray(seat_status_ids)) throw new BadRequestError('show_id and seat_status_ids required');

  const booking = await prisma.$transaction(async (tx) => {
    const idsString = seat_status_ids.map(id => `'${id}'`).join(',');
    const seats = await tx.$queryRawUnsafe<any[]>(
      `SELECT * FROM seat_status WHERE id IN (${idsString}) AND show_id = $1 FOR UPDATE`,
      show_id
    );

    const now = new Date();
    for (const seat of seats) {
      const seatHeldBy = seat.held_by ? String(seat.held_by).toLowerCase().trim() : null;
      const userId = req.user!.id.toLowerCase().trim();
      if (seat.status !== 'held') {
        throw new ConflictError(`Seat ${seat.id} is not in held status (current: ${seat.status})`);
      }
      if (seatHeldBy !== userId) {
        throw new ConflictError('Seat is not held by you or hold expired');
      }
      if (seat.hold_expires_at && new Date(seat.hold_expires_at) < now) {
        throw new ConflictError('Hold has expired — please re-select and hold the seat');
      }
    }

    // Fetch pricing to calculate total
    const showPrices = await tx.showCategoryPricing.findMany({
      where: { show_id }
    });
    
    // Map categories to prices
    const priceMap = new Map();
    showPrices.forEach(sp => priceMap.set(sp.category_id, Number(sp.price)));

    let totalPrice = 0;

    // Fetch the venue_seats to know the category
    const seatIds = seats.map(s => `'${s.venue_seat_id}'`).join(',');
    const venueSeats = await tx.$queryRawUnsafe<any[]>(
      `SELECT * FROM venue_seats WHERE id IN (${seatIds})`
    );
    const categoryMap = new Map();
    venueSeats.forEach(vs => categoryMap.set(vs.id, vs.category_id));

    for (const seat of seats) {
      const catId = categoryMap.get(seat.venue_seat_id);
      totalPrice += priceMap.get(catId) || 0;
    }

    const bookingRef = `QR-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newBooking = await tx.booking.create({
      data: { 
        customer_id: req.user!.id, 
        // @ts-ignore - IDE caches old Prisma types, tsc passes
        customer_name,
        // @ts-ignore
        customer_phone,
        show_id, 
        booking_reference: bookingRef, 
        total_price: totalPrice 
      }
    });

    for (const seat of seats) {
      await tx.bookingSeat.create({
        data: { booking_id: newBooking.id, venue_seat_id: seat.venue_seat_id }
      });
      await tx.seatStatus.update({
        where: { id: seat.id },
        data: { status: 'booked', held_by: null, hold_expires_at: null, booking_id: newBooking.id }
      });
    }
    return newBooking;
  });

  const showDetails = await prisma.show.findUnique({ 
    where: { id: show_id }, 
    include: { event: true, venue: true } 
  });
  
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const bookingWithSeats = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { seats: { include: { venue_seat: true } } }
  });
  const seatLabels = bookingWithSeats?.seats.map(s => `${s.venue_seat.row_label}${s.venue_seat.seat_number}`) || [];

  const qrUrl = await sendBookingEmail(user!.email, booking.booking_reference, showDetails, customer_name || user?.name, seatLabels);
  if (qrUrl) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { qr_code_url: qrUrl }
    });
  }

  const updatedStatuses = await prisma.seatStatus.findMany({ where: { id: { in: seat_status_ids } } });
  updatedStatuses.forEach(seat => io.to(show_id).emit('seat_status_updated', seat));

  res.json({ status: 'success', data: booking });
};

export const releaseHold = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const updatedSeat = await prisma.$transaction(async (tx) => {
    const seatArray = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM seat_status WHERE id = $1 FOR UPDATE`, id);
    if (!seatArray.length) throw new NotFoundError('Seat not found');
    const seat = seatArray[0];
    const seatHeldBy = seat.held_by ? String(seat.held_by).toLowerCase().trim() : null;
    const userId = req.user!.id.toLowerCase().trim();
    if (seatHeldBy !== userId) throw new ConflictError('You do not hold this seat');

    return await tx.seatStatus.update({
      where: { id },
      data: { status: 'available', held_by: null, hold_expires_at: null },
      include: { venue_seat: { include: { category: true } } }
    });
  });

  io.to(updatedSeat.show_id).emit('seat_status_updated', updatedSeat);
  res.json({ status: 'success', data: updatedSeat });
};

export const getMyBookings = async (req: AuthRequest, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { customer_id: req.user!.id },
    include: { show: { include: { event: true } }, seats: { include: { venue_seat: true } } }
  });
  res.json({ status: 'success', data: bookings });
};

// -- Waitlist & Cancel Booking flow -- //

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { seats: { include: { venue_seat: true } }, show: true }
  }) as any;

  if (!booking || booking.customer_id !== req.user!.id) throw new NotFoundError('Booking not found');
  if (booking.status === 'cancelled') throw new ConflictError('Already cancelled');

  // Cancel booking
  await prisma.booking.update({
    where: { id },
    data: { status: 'cancelled' }
  });

  // Reallocate each freed seat via waitlist mechanism
  for (const bSeat of booking.seats) {
    const seatId = bSeat.venue_seat.id;
    const catId = bSeat.venue_seat.category_id;
    const showId = booking.show_id;
    
    // Find waitlist entry for this category
    const waitlistEntry = await prisma.$transaction(async (tx) => {
      // Find oldest waiting entry
      const entry = await tx.waitlistEntry.findFirst({
        where: { show_id: showId, category_id: catId, status: 'waiting' },
        orderBy: { position: 'asc' }
      });

      if (entry) {
        // Offer seat to waitlist
        const offerTTL = Number(process.env.WAITLIST_OFFER_TTL_MINUTES) || 15;
        const expiresAt = new Date(Date.now() + offerTTL * 60000);
        
        await tx.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: 'offered', offered_venue_seat_id: seatId, offer_expires_at: expiresAt }
        });

        // Reserve seat strictly for waitlist user (invisible generally)
        await tx.seatStatus.update({
          where: { show_id_venue_seat_id: { show_id: showId, venue_seat_id: seatId } },
          data: { status: 'held', held_by: entry.customer_id, booking_id: null, hold_expires_at: expiresAt }
        });

        return entry;
      } else {
        // No one on waitlist, make available
        await tx.seatStatus.update({
          where: { show_id_venue_seat_id: { show_id: showId, venue_seat_id: seatId } },
          data: { status: 'available', held_by: null, booking_id: null, hold_expires_at: null }
        });
        return null;
      }
    });

    // Broadcast seat status update
    const finalSeatStatus = await prisma.seatStatus.findUnique({
      where: { show_id_venue_seat_id: { show_id: showId, venue_seat_id: seatId } }
    });
    io.to(showId).emit('seat_status_updated', finalSeatStatus);

    // Send email to waitlisted user if offered
    if (waitlistEntry) {
      const waitlistUser = await prisma.user.findUnique({ where: { id: waitlistEntry.customer_id } });
      const showDetails = await prisma.show.findUnique({ where: { id: showId }, include: { event: true } });
      if (waitlistUser && showDetails) {
        await sendWaitlistOfferEmail(waitlistUser.email, waitlistEntry.id, showDetails);
      }
    }
  }

  res.json({ status: 'success', message: 'Booking cancelled and seats reallocated' });
};

export const joinWaitlist = async (req: AuthRequest, res: Response) => {
  const show_id = req.params.id as string;
  const { category_id } = req.body;
  if (!category_id) throw new BadRequestError('category_id required');

  // Check if they already joined
  const existing = await prisma.waitlistEntry.findFirst({
    where: { show_id, category_id, customer_id: req.user!.id, status: { in: ['waiting', 'offered'] } }
  });
  if (existing) throw new ConflictError('You are already on the waitlist for this category');

  // Find max position
  const maxPosEntry = await prisma.waitlistEntry.findFirst({
    where: { show_id, category_id },
    orderBy: { position: 'desc' }
  });
  const position = maxPosEntry ? maxPosEntry.position + 1 : 1;

  const entry = await prisma.waitlistEntry.create({
    data: {
      show_id,
      category_id,
      customer_id: req.user!.id,
      position
    }
  });

  res.status(201).json({ status: 'success', data: entry });
};

export const viewWaitlistOffer = async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: token },
    include: { show: { include: { event: true } }, offered_seat: true }
  });

  if (!entry) throw new NotFoundError('Waitlist offer not found');
  if (entry.status !== 'offered' || !entry.offer_expires_at || new Date(entry.offer_expires_at) < new Date()) {
    throw new BadRequestError('Offer is invalid or has expired');
  }

  res.json({ status: 'success', data: entry });
};

export const acceptWaitlistOffer = async (req: AuthRequest, res: Response) => {
  const token = req.params.token as string;
  const entry = await prisma.waitlistEntry.findUnique({ where: { id: token } });

  if (!entry) throw new NotFoundError('Waitlist offer not found');
  if (entry.customer_id !== req.user!.id) throw new ForbiddenError('This offer is not for you');
  if (entry.status !== 'offered' || !entry.offer_expires_at || new Date(entry.offer_expires_at) < new Date()) {
    throw new BadRequestError('Offer is invalid or has expired');
  }

  // Create booking
  const bookingRef = `QR-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  const booking = await prisma.$transaction(async (tx) => {
    // Fetch pricing for this specific category
    const pricing = await tx.showCategoryPricing.findUnique({
      where: { show_id_category_id: { show_id: entry.show_id, category_id: entry.category_id } }
    });
    const priceToCharge = pricing ? Number(pricing.price) : 0;

    const user = await tx.user.findUnique({ where: { id: req.user!.id } });
    
    const newBooking = await tx.booking.create({
      data: { 
        customer_id: req.user!.id, 
        // @ts-ignore - IDE caches old Prisma types, tsc passes
        customer_name: user?.name || 'Waitlist User',
        show_id: entry.show_id, 
        booking_reference: bookingRef, 
        total_price: priceToCharge
      }
    });

    await tx.bookingSeat.create({
      data: { booking_id: newBooking.id, venue_seat_id: entry.offered_venue_seat_id! }
    });

    await tx.seatStatus.update({
      where: { show_id_venue_seat_id: { show_id: entry.show_id, venue_seat_id: entry.offered_venue_seat_id! } },
      data: { status: 'booked', held_by: null, hold_expires_at: null, booking_id: newBooking.id }
    });

    await tx.waitlistEntry.update({
      where: { id: token },
      data: { status: 'booked' }
    });

    return newBooking;
  });

  const showDetails = await prisma.show.findUnique({ where: { id: entry.show_id }, include: { event: true } });
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const qrUrl = await sendBookingEmail(user!.email, booking.booking_reference, showDetails);
  
  if (qrUrl) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { qr_code_url: qrUrl }
    });
  }

  const updatedStatus = await prisma.seatStatus.findUnique({
    where: { show_id_venue_seat_id: { show_id: entry.show_id, venue_seat_id: entry.offered_venue_seat_id! } }
  });
  io.to(entry.show_id).emit('seat_status_updated', updatedStatus);

  res.json({ status: 'success', data: booking });
};
