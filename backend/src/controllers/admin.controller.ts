import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';

// --- Venues ---
export const createVenue = async (req: AuthRequest, res: Response) => {
  const { name, address } = req.body;
  if (!name || !address) throw new BadRequestError('Name and address required');

  const venue = await prisma.venue.create({
    data: { name, address, created_by: req.user!.id }
  });

  res.status(201).json({ status: 'success', data: venue });
};

export const updateVenue = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, address } = req.body;

  const venue = await prisma.venue.update({
    where: { id },
    data: { name, address }
  });

  res.json({ status: 'success', data: venue });
};

export const getVenues = async (req: Request, res: Response) => {
  const venues = await prisma.venue.findMany();
  res.json({ status: 'success', data: venues });
};

// --- Seat Categories ---
export const createSeatCategory = async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) throw new BadRequestError('Name required');

  const category = await prisma.seatCategory.create({
    data: { name }
  });

  res.status(201).json({ status: 'success', data: category });
};

export const getSeatCategories = async (req: Request, res: Response) => {
  const categories = await prisma.seatCategory.findMany();
  res.json({ status: 'success', data: categories });
};

// --- Bulk Layout Upload ---
export const createVenueSeats = async (req: Request, res: Response) => {
  const venue_id = req.params.id as string;
  const { seats } = req.body; // Array of { row_label, seat_number, category_id }

  if (!Array.isArray(seats) || seats.length === 0) {
    throw new BadRequestError('Seats array required');
  }

  // Ensure venue exists
  const venue = await prisma.venue.findUnique({ where: { id: venue_id } });
  if (!venue) throw new NotFoundError('Venue not found');

  // We could use createMany, but Prisma returns count, so we'll just execute it
  const createdSeats = await prisma.venueSeat.createMany({
    data: seats.map((seat: any) => ({
      venue_id,
      row_label: seat.row_label,
      seat_number: seat.seat_number,
      category_id: seat.category_id
    })),
    skipDuplicates: true // in case of re-run
  });

  res.status(201).json({
    status: 'success',
    message: `Created ${createdSeats.count} seats for venue`,
    data: { count: createdSeats.count }
  });
};
