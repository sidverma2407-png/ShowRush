import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { io } from '../index';
import { sendBookingEmail, sendWaitlistOfferEmail } from '../utils/email';

export const getEvents = async (req: Request, res: Response) => {
  const { language, format, genre, city } = req.query;

  const where: any = {};
  if (language && language !== 'All') {
    where.language = { contains: String(language), mode: 'insensitive' };
  }
  if (format && format !== 'All') {
    where.format = { contains: String(format), mode: 'insensitive' };
  }
  if (genre && genre !== 'All') {
    where.genre = { contains: String(genre), mode: 'insensitive' };
  }

  const events = await prisma.event.findMany({
    where,
    include: {
      shows: {
        include: { venue: true }
      },
      reviews: {
        select: { rating: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  // Calculate aggregate star rating for each event
  const processed = events.map(evt => {
    const totalReviews = evt.reviews.length;
    const avgRating = totalReviews > 0
      ? (evt.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : null;
    const { reviews, ...rest } = evt;
    return { ...rest, average_rating: avgRating ? Number(avgRating) : null, review_count: totalReviews };
  });

  res.json({ status: 'success', data: processed });
};

export const getEventDetails = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const authHeader = req.headers.authorization;
  let currentUserId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      currentUserId = decoded.id;
    } catch (e) {
      // invalid token, treat as guest
    }
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      shows: {
        include: {
          venue: true,
          pricing: { include: { category: true } }
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }]
      },
      reviews: {
        include: {
          customer: { select: { id: true, name: true } }
        },
        orderBy: { created_at: 'desc' }
      }
    }
  });

  if (!event) throw new NotFoundError('Event not found');

  // Compute aggregate rating
  const totalReviews = event.reviews.length;
  const avgRating = totalReviews > 0
    ? (event.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : null;

  // Check if current logged in customer has a confirmed booking for this event
  let userHasBooking = false;
  if (currentUserId) {
    const bookingCount = await prisma.booking.count({
      where: {
        customer_id: currentUserId,
        show: { event_id: id },
        status: 'confirmed'
      }
    });
    userHasBooking = bookingCount > 0;
  }

  res.json({
    status: 'success',
    data: {
      ...event,
      average_rating: avgRating ? Number(avgRating) : null,
      review_count: totalReviews,
      user_has_booking: userHasBooking
    }
  });
};

export const getEventReviews = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const reviews = await prisma.review.findMany({
    where: { event_id: id },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { created_at: 'desc' }
  });
  res.json({ status: 'success', data: reviews });
};

export const createEventReview = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { rating, review_text } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new BadRequestError('Rating must be an integer between 1 and 5');
  }
  if (!review_text || !review_text.trim()) {
    throw new BadRequestError('Review text is required');
  }

  const review = await prisma.review.upsert({
    where: {
      event_id_customer_id: {
        event_id: id,
        customer_id: req.user!.id
      }
    },
    update: {
      rating: Number(rating),
      review_text: review_text.trim(),
      updated_at: new Date()
    },
    create: {
      event_id: id,
      customer_id: req.user!.id,
      rating: Number(rating),
      review_text: review_text.trim()
    },
    include: {
      customer: { select: { id: true, name: true } }
    }
  });

  // Calculate new aggregate average rating
  const allReviews = await prisma.review.findMany({
    where: { event_id: id }
  });

  const totalReviews = allReviews.length;
  const avgRating = totalReviews > 0
    ? Number((allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
    : null;

  // Real-time rating & review update broadcast via Socket.IO
  io.emit('review_updated', {
    event_id: id,
    average_rating: avgRating,
    review_count: totalReviews,
    new_review: review
  });

  res.status(201).json({
    status: 'success',
    data: {
      review,
      average_rating: avgRating,
      review_count: totalReviews
    }
  });
};

export const getAddonItems = async (req: Request, res: Response) => {
  const addons = await prisma.addonItem.findMany({
    where: { available: true },
    orderBy: { category: 'asc' }
  });
  res.json({ status: 'success', data: addons });
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
  const { show_id, seat_status_ids, customer_name, customer_phone, addons, coupon_code } = req.body;
  if (!show_id || !Array.isArray(seat_status_ids)) throw new BadRequestError('show_id and seat_status_ids required');

  const booking = await prisma.$transaction(async (tx) => {
    const idsString = seat_status_ids.map(id => `'${id}'`).join(',');
    const seats = await tx.$queryRawUnsafe<any[]>(
      `SELECT * FROM seat_status WHERE id IN (${idsString}) AND show_id = $1 FOR UPDATE`,
      show_id
    );

    if (!seats || seats.length === 0) {
      throw new NotFoundError('Held seats not found or hold has expired. Please re-select your seats.');
    }

    if (seats.length !== seat_status_ids.length) {
      throw new ConflictError('One or more seats are no longer held. Please re-select your seats.');
    }

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

    let seatTotalPrice = 0;

    // Fetch the venue_seats to know the category
    const seatIds = seats.map(s => `'${s.venue_seat_id}'`).filter(Boolean).join(',');
    let venueSeats: any[] = [];
    if (seatIds.length > 0) {
      venueSeats = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM venue_seats WHERE id IN (${seatIds})`
      );
    }

    const categoryMap = new Map();
    venueSeats.forEach(vs => categoryMap.set(vs.id, vs.category_id));

    for (const seat of seats) {
      const catId = categoryMap.get(seat.venue_seat_id);
      seatTotalPrice += priceMap.get(catId) || 0;
    }

    // STACKING RULE 1: Group Discount applied FIRST to full seat subtotal (10% off for 5+ seats)
    const groupDiscountAmount = seats.length >= 5 ? Math.round(seatTotalPrice * 0.10 * 100) / 100 : 0;
    const reducedSeatSubtotal = Math.max(0, seatTotalPrice - groupDiscountAmount);

    // Process optional food & drinks add-ons
    let addonTotalPrice = 0;
    const validatedAddons: { addon_item_id: string; quantity: number; unit_price: number }[] = [];
    if (Array.isArray(addons) && addons.length > 0) {
      for (const item of addons) {
        if (item.addon_item_id && item.quantity > 0) {
          const addonDb = await tx.addonItem.findUnique({ where: { id: item.addon_item_id } });
          if (addonDb && addonDb.available) {
            const itemPrice = Number(addonDb.price);
            addonTotalPrice += itemPrice * item.quantity;
            validatedAddons.push({
              addon_item_id: addonDb.id,
              quantity: Number(item.quantity),
              unit_price: itemPrice
            });
          }
        }
      }
    }

    const totalCartBeforeCoupon = reducedSeatSubtotal + addonTotalPrice;

    // STACKING RULE 2 & CONCURRENCY: Coupon processing
    let couponDiscountAmount = 0;
    let appliedCouponId: string | null = null;

    if (coupon_code && typeof coupon_code === 'string' && coupon_code.trim()) {
      const formattedCode = coupon_code.trim().toUpperCase();
      const coupon = await tx.coupon.findUnique({ where: { code: formattedCode } });

      if (!coupon) {
        throw new BadRequestError('Invalid coupon code');
      }

      // Check 4 strict validation conditions inside transaction
      if (!coupon.is_active) {
        throw new BadRequestError('This promo code is currently inactive');
      }

      if (coupon.expires_at && coupon.expires_at < now) {
        throw new BadRequestError('This promo code has expired');
      }

      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        throw new ConflictError('This promo code usage limit has been reached');
      }

      if (coupon.min_amount !== null && totalCartBeforeCoupon < Number(coupon.min_amount)) {
        throw new BadRequestError(`Minimum subtotal of ₹${coupon.min_amount} is required to apply ${coupon.code}`);
      }

      // Atomic reservation of coupon slot with concurrency protection
      const incrementResult = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          is_active: true,
          OR: [
            { max_uses: null },
            { used_count: { lt: coupon.max_uses! } }
          ]
        },
        data: {
          used_count: { increment: 1 }
        }
      });

      if (incrementResult.count === 0) {
        throw new ConflictError('Coupon slot was taken by another user during checkout');
      }

      appliedCouponId = coupon.id;
      const discountVal = Number(coupon.discount_value);

      if (coupon.discount_type === 'percentage') {
        couponDiscountAmount = Math.round((reducedSeatSubtotal * (discountVal / 100)) * 100) / 100;
      } else {
        couponDiscountAmount = Math.min(reducedSeatSubtotal, discountVal);
      }
    }

    const finalTotalPrice = Math.max(0, seatTotalPrice - groupDiscountAmount + addonTotalPrice - couponDiscountAmount);
    const bookingRef = `QR-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const newBooking = await tx.booking.create({
      data: { 
        customer_id: req.user!.id, 
        // @ts-ignore
        customer_name,
        // @ts-ignore
        customer_phone,
        show_id, 
        booking_reference: bookingRef, 
        total_price: finalTotalPrice,
        group_discount_amount: groupDiscountAmount,
        discount_amount: couponDiscountAmount,
        coupon_id: appliedCouponId
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

    // Insert itemized food & drinks add-ons snapshot
    for (const addOn of validatedAddons) {
      await tx.bookingAddon.create({
        data: {
          booking_id: newBooking.id,
          addon_item_id: addOn.addon_item_id,
          quantity: addOn.quantity,
          unit_price_at_booking: addOn.unit_price
        }
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
    include: { 
      seats: { 
        include: { 
          venue_seat: { 
            include: { category: true } 
          } 
        } 
      } 
    }
  });
  const seatLabels = bookingWithSeats?.seats.map(s => `${s.venue_seat.row_label}${s.venue_seat.seat_number} (${s.venue_seat.category.name})`) || [];

  const qrUrl = await sendBookingEmail(
    user!.email, 
    booking.booking_reference, 
    showDetails, 
    customer_name || user?.name, 
    seatLabels,
    Number(booking.total_price),
    customer_phone || 'N/A'
  );

  if (qrUrl) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { qr_code_url: qrUrl }
    });
  }

  const updatedStatuses = await prisma.seatStatus.findMany({ where: { id: { in: seat_status_ids } } });
  updatedStatuses.forEach(seat => io.to(show_id).emit('seat_status_updated', seat));
  io.emit('dashboard_updated', { event_id: showDetails?.event_id, show_id, booking_id: booking.id, amount: Number(booking.total_price) });
  io.emit('booking_created', { event_id: showDetails?.event_id, show_id, booking_id: booking.id, amount: Number(booking.total_price) });

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
    include: {
      show: { include: { event: true, venue: true } },
      seats: { include: { venue_seat: { include: { category: true } } } },
      booking_addons: { include: { addon_item: true } }
    },
    orderBy: { created_at: 'desc' }
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

  // RULE 4: Decrement coupon used_count if booking used a promo code
  if (booking.coupon_id) {
    try {
      await prisma.coupon.update({
        where: { id: booking.coupon_id },
        data: { used_count: { decrement: 1 } }
      });
    } catch (err) {
      console.error('Failed to decrement coupon used_count on cancellation:', err);
    }
  }

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

  io.emit('dashboard_updated', { event_id: booking.show?.event_id, show_id: booking.show_id });

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

  const showDetails = await prisma.show.findUnique({ where: { id: entry.show_id }, include: { event: true, venue: true } });
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const offeredSeat = await prisma.venueSeat.findUnique({ where: { id: entry.offered_venue_seat_id! }, include: { category: true } });
  const seatLabels = offeredSeat ? [`${offeredSeat.row_label}${offeredSeat.seat_number} (${offeredSeat.category.name})`] : [];
  const qrUrl = await sendBookingEmail(
    user!.email,
    booking.booking_reference,
    showDetails,
    user?.name,
    seatLabels,
    Number(booking.total_price),
    'N/A'
  );
  
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

export const verifyTicketByRef = async (req: Request, res: Response) => {
  const ref = req.params.ref as string;
  if (!ref) {
    return res.status(400).json({ status: 'error', message: 'Booking reference is required' });
  }

  const booking = await prisma.booking.findFirst({
    where: { booking_reference: ref },
    include: {
      customer: true,
      show: {
        include: {
          event: true,
          venue: true
        }
      },
      seats: {
        include: {
          venue_seat: {
            include: { category: true }
          }
        }
      },
      booking_addons: {
        include: {
          addon_item: true
        }
      }
    }
  });

  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Ticket pass not found or invalid reference' });
  }

  res.json({
    status: 'success',
    data: {
      id: booking.id,
      booking_reference: booking.booking_reference,
      status: booking.status,
      customer_name: booking.customer_name || booking.customer?.name || 'Valued Guest',
      customer_phone: booking.customer_phone || 'N/A',
      total_price: Number(booking.total_price),
      created_at: booking.created_at,
      event: {
        id: booking.show.event.id,
        title: booking.show.event.title,
        type: booking.show.event.type,
        poster_url: booking.show.event.poster_url,
        certification: booking.show.event.certification,
        language: booking.show.language || booking.show.event.language,
        format: booking.show.format || booking.show.event.format,
        genre: booking.show.event.genre
      },
      show: {
        id: booking.show.id,
        date: booking.show.date,
        time: booking.show.time,
        language: booking.show.language,
        format: booking.show.format
      },
      venue: {
        name: booking.show.venue.name,
        city: booking.show.venue.city,
        address: booking.show.venue.address
      },
      seats: booking.seats.map((s: any) => ({
        label: `${s.venue_seat.row_label}${s.venue_seat.seat_number}`,
        category: s.venue_seat.category.name,
        price: Number(s.venue_seat.category.price || 0)
      })),
      addons: booking.booking_addons.map((ba: any) => ({
        name: ba.addon_item.name,
        quantity: ba.quantity
      }))
    }
  });
};
