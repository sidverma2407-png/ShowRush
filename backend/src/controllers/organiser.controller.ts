import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { EventType, ShowStatus } from '@prisma/client';

export const getMyEvents = async (req: AuthRequest, res: Response) => {
  const events = await prisma.event.findMany({
    where: { organiser_id: req.user!.id },
    include: {
      shows: {
        include: {
          venue: true,
          pricing: { include: { category: true } },
          seat_statuses: true,
          bookings: { where: { status: 'confirmed' } }
        }
      }
    }
  });
  res.json({ status: 'success', data: events });
};

export const createEvent = async (req: AuthRequest, res: Response) => {
  const { title, type, description, poster_url, language, format, genre, certification, cast, trailer_url } = req.body;
  if (!title || !type || !description) {
    throw new BadRequestError('Title, type, and description required');
  }

  const event = await prisma.event.create({
    data: {
      title,
      type: type as EventType,
      description,
      poster_url,
      language: language || null,
      format: format || null,
      genre: genre || null,
      certification: certification || null,
      cast: cast || null,
      trailer_url: trailer_url || null,
      organiser_id: req.user!.id
    }
  });

  res.status(201).json({ status: 'success', data: event });
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { title, type, description, poster_url, language, format, genre, certification, cast, trailer_url } = req.body;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || event.organiser_id !== req.user!.id) {
    throw new NotFoundError('Event not found or not owned by you');
  }

  const updated = await prisma.event.update({
    where: { id },
    data: {
      title,
      type: type as EventType,
      description,
      poster_url,
      language: language !== undefined ? language : event.language,
      format: format !== undefined ? format : event.format,
      genre: genre !== undefined ? genre : event.genre,
      certification: certification !== undefined ? certification : event.certification,
      cast: cast !== undefined ? cast : event.cast,
      trailer_url: trailer_url !== undefined ? trailer_url : event.trailer_url
    }
  });

  res.json({ status: 'success', data: updated });
};

export const createShow = async (req: AuthRequest, res: Response) => {
  const event_id = req.params.id as string;
  const { venue_id, date, time, pricing } = req.body;

  if (!venue_id || !date || !time) throw new BadRequestError('Venue, date, and time required');

  const event = await prisma.event.findUnique({ where: { id: event_id } });
  if (!event || event.organiser_id !== req.user!.id) {
    throw new NotFoundError('Event not found or not owned by you');
  }

  const show = await prisma.$transaction(async (tx) => {
    const newShow = await tx.show.create({
      data: { event_id, venue_id, date: new Date(date), time, status: ShowStatus.scheduled }
    });

    const venueSeats = await tx.venueSeat.findMany({ where: { venue_id } });

    if (venueSeats.length > 0) {
      await tx.seatStatus.createMany({
        data: venueSeats.map(seat => ({
          show_id: newShow.id,
          venue_seat_id: seat.id,
          status: 'available'
        }))
      });
    }

    if (Array.isArray(pricing) && pricing.length > 0) {
      await tx.showCategoryPricing.createMany({
        data: pricing.map((p: any) => ({
          show_id: newShow.id,
          category_id: p.category_id,
          price: p.price
        })),
        skipDuplicates: true
      });
    }

    return newShow;
  });

  res.status(201).json({ status: 'success', data: show });
};

export const updateShowPricing = async (req: AuthRequest, res: Response) => {
  const show_id = req.params.id as string;
  const { pricing } = req.body;

  if (!Array.isArray(pricing)) throw new BadRequestError('Pricing array required');

  const show = await prisma.show.findUnique({
    where: { id: show_id },
    include: { event: true }
  });

  if (!show || show.event.organiser_id !== req.user!.id) {
    throw new NotFoundError('Show not found or not owned by you');
  }

  for (const item of pricing) {
    await prisma.showCategoryPricing.upsert({
      where: { show_id_category_id: { show_id, category_id: item.category_id } },
      update: { price: item.price },
      create: { show_id, category_id: item.category_id, price: item.price }
    });
  }

  res.json({ status: 'success', message: 'Pricing updated' });
};

export const cancelShow = async (req: AuthRequest, res: Response) => {
  const show_id = req.params.id as string;

  const show = await prisma.show.findUnique({
    where: { id: show_id },
    include: { event: true }
  });

  if (!show || show.event.organiser_id !== req.user!.id) {
    throw new NotFoundError('Show not found or not owned by you');
  }

  await prisma.show.update({ where: { id: show_id }, data: { status: ShowStatus.cancelled } });
  res.json({ status: 'success', message: 'Show cancelled' });
};

export const getEventSummary = async (req: AuthRequest, res: Response) => {
  const event_id = req.params.id as string;

  const event = await prisma.event.findUnique({ where: { id: event_id } });
  if (!event || event.organiser_id !== req.user!.id) {
    throw new NotFoundError('Event not found or not owned by you');
  }

  const bookings = await prisma.booking.findMany({
    where: { show: { event_id }, status: 'confirmed' }
  });
  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_price), 0);

  const shows = await prisma.show.findMany({
    where: { event_id },
    include: {
      venue: true,
      pricing: { include: { category: true } },
      seat_statuses: true,
      waitlist_entries: true
    }
  }) as any[];

  const summary = shows.map(show => {
    const available = show.seat_statuses.filter((s: any) => s.status === 'available').length;
    const booked = show.seat_statuses.filter((s: any) => s.status === 'booked').length;
    const held = show.seat_statuses.filter((s: any) => s.status === 'held').length;
    const waitlist = show.waitlist_entries.filter((w: any) => w.status === 'waiting').length;
    return {
      show_id: show.id,
      date: show.date,
      time: show.time,
      status: show.status,
      venue: show.venue,
      pricing: show.pricing,
      seats: { available, booked, held, total: show.seat_statuses.length },
      waitlist_waiting: waitlist
    };
  });

  const recent_bookings = bookings
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, 50)
    .map(b => ({
      id: b.id,
      reference: b.booking_reference,
      customer_name: b.customer_name || 'N/A',
      customer_phone: b.customer_phone || 'N/A',
      total_price: Number(b.total_price),
      date: b.created_at
    }));

  res.json({
    status: 'success',
    data: { total_revenue: totalRevenue, total_tickets: bookings.length, shows: summary, recent_bookings }
  });
};

export const getMyVenues = async (req: AuthRequest, res: Response) => {
  const venues = await prisma.venue.findMany({
    where: { created_by: req.user!.id },
    include: {
      seats: { include: { category: true } },
      _count: { select: { seats: true, shows: true } }
    }
  });
  res.json({ status: 'success', data: venues });
};

export const createVenue = async (req: AuthRequest, res: Response) => {
  const { name, address, city, layout } = req.body;
  if (!name || !address || !city) throw new BadRequestError('Name, address, and city are required');

  const getCategoryId = async (catName: string) => {
    let cat = await prisma.seatCategory.findFirst({ where: { name: catName } });
    if (!cat) cat = await prisma.seatCategory.create({ data: { name: catName } });
    return cat.id;
  };

  const venue = await prisma.$transaction(async (tx) => {
    const newVenue = await tx.venue.create({
      data: { name, address, city, created_by: req.user!.id }
    });

    if (Array.isArray(layout?.rows)) {
      for (const row of layout.rows) {
        const category_id = await getCategoryId(row.category_name || 'Standard');
        const seatData = [];
        for (let n = 1; n <= (row.seats || 0); n++) {
          seatData.push({ venue_id: newVenue.id, row_label: row.label, seat_number: n, category_id });
        }
        if (seatData.length > 0) {
          await tx.venueSeat.createMany({ data: seatData, skipDuplicates: true });
        }
      }
    }
    return newVenue;
  });

  const fullVenue = await prisma.venue.findUnique({
    where: { id: venue.id },
    include: { seats: { include: { category: true } }, _count: { select: { seats: true, shows: true } } }
  });

  res.status(201).json({ status: 'success', data: fullVenue });
};

export const getSeatCategories = async (_req: Request, res: Response) => {
  const categories = await prisma.seatCategory.findMany({ orderBy: { name: 'asc' } });
  res.json({ status: 'success', data: categories });
};
