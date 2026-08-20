import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { EventType, ShowStatus } from '@prisma/client';

export const createEvent = async (req: AuthRequest, res: Response) => {
  const { title, type, description, poster_url } = req.body;
  if (!title || !type || !description) {
    throw new BadRequestError('Title, type, and description required');
  }

  const event = await prisma.event.create({
    data: {
      title,
      type: type as EventType,
      description,
      poster_url,
      organiser_id: req.user!.id
    }
  });

  res.status(201).json({ status: 'success', data: event });
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, type, description, poster_url } = req.body;

  // Verify ownership
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || event.organiser_id !== req.user!.id) {
    throw new NotFoundError('Event not found or not owned by you');
  }

  const updated = await prisma.event.update({
    where: { id },
    data: { title, type: type as EventType, description, poster_url }
  });

  res.json({ status: 'success', data: updated });
};

export const createShow = async (req: AuthRequest, res: Response) => {
  const { id: event_id } = req.params;
  const { venue_id, date, time } = req.body; // e.g. date: '2026-10-15T00:00:00Z', time: '19:00'

  if (!venue_id || !date || !time) throw new BadRequestError('Venue, date, and time required');

  // Verify ownership
  const event = await prisma.event.findUnique({ where: { id: event_id } });
  if (!event || event.organiser_id !== req.user!.id) {
    throw new NotFoundError('Event not found or not owned by you');
  }

  // Create show and bulk insert seat_status (CRITICAL WORKFLOW)
  // We use interactive transaction to ensure both happen or neither
  const show = await prisma.$transaction(async (tx) => {
    // 1. Create the show
    const newShow = await tx.show.create({
      data: {
        event_id,
        venue_id,
        date: new Date(date),
        time,
        status: ShowStatus.scheduled
      }
    });

    // 2. Fetch all seats for the venue
    const venueSeats = await tx.venueSeat.findMany({
      where: { venue_id }
    });

    if (venueSeats.length > 0) {
      // 3. Bulk insert seat_status rows for every seat at this venue
      await tx.seatStatus.createMany({
        data: venueSeats.map(seat => ({
          show_id: newShow.id,
          venue_seat_id: seat.id,
          status: 'available'
        }))
      });
    }

    return newShow;
  });

  res.status(201).json({ status: 'success', data: show });
};

export const updateShowPricing = async (req: AuthRequest, res: Response) => {
  const { id: show_id } = req.params;
  const { pricing } = req.body; // Array of { category_id, price }

  if (!Array.isArray(pricing)) throw new BadRequestError('Pricing array required');

  // Verify ownership via show -> event -> organiser
  const show = await prisma.show.findUnique({
    where: { id: show_id },
    include: { event: true }
  });

  if (!show || show.event.organiser_id !== req.user!.id) {
    throw new NotFoundError('Show not found or not owned by you');
  }

  // Upsert pricing for each category
  for (const item of pricing) {
    await prisma.showCategoryPricing.upsert({
      where: {
        show_id_category_id: { show_id, category_id: item.category_id }
      },
      update: { price: item.price },
      create: { show_id, category_id: item.category_id, price: item.price }
    });
  }

  res.json({ status: 'success', message: 'Pricing updated' });
};

export const getEventSummary = async (req: AuthRequest, res: Response) => {
  const { id: event_id } = req.params;

  // Verify ownership
  const event = await prisma.event.findUnique({ where: { id: event_id } });
  if (!event || event.organiser_id !== req.user!.id) {
    throw new NotFoundError('Event not found or not owned by you');
  }

  // Get total revenue
  const bookings = await prisma.booking.findMany({
    where: { show: { event_id }, status: 'confirmed' }
  });
  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_price), 0);

  // Seat stats per show -> waitlist, etc. (simplified for this return)
  // In a real app we'd aggregate carefully
  const shows = await prisma.show.findMany({
    where: { event_id },
    include: {
      seat_statuses: true,
      waitlist_entries: true
    }
  });

  const summary = shows.map(show => {
    const available = show.seat_statuses.filter(s => s.status === 'available').length;
    const booked = show.seat_statuses.filter(s => s.status === 'booked').length;
    const held = show.seat_statuses.filter(s => s.status === 'held').length;
    const waitlist = show.waitlist_entries.filter(w => w.status === 'waiting').length;

    return {
      show_id: show.id,
      date: show.date,
      time: show.time,
      seats: { available, booked, held },
      waitlist_waiting: waitlist
    };
  });

  res.json({
    status: 'success',
    data: {
      total_revenue: totalRevenue,
      shows: summary
    }
  });
};
