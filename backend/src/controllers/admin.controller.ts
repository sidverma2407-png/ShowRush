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

export const deleteVenue = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  
  // Check if any shows exist for this venue
  const showCount = await prisma.show.count({ where: { venue_id: id } });
  if (showCount > 0) {
    throw new BadRequestError('Cannot delete venue because it is linked to active or past shows.');
  }

  await prisma.venueSeat.deleteMany({ where: { venue_id: id } });
  await prisma.venue.delete({ where: { id } });

  res.json({ status: 'success', message: 'Venue deleted successfully' });
};

export const getVenues = async (req: Request, res: Response) => {
  const venues = await prisma.venue.findMany({
    include: {
      seats: {
        include: {
          category: true
        }
      },
      _count: {
        select: { seats: true, shows: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });
  res.json({ status: 'success', data: venues });
};

// --- Seat Categories ---
export const createSeatCategory = async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) throw new BadRequestError('Name required');

  const cleanName = name.trim();
  const existing = await prisma.seatCategory.findFirst({
    where: { name: { equals: cleanName, mode: 'insensitive' } }
  });
  if (existing) {
    return res.status(200).json({ status: 'success', data: existing });
  }

  const category = await prisma.seatCategory.create({
    data: { name: cleanName }
  });

  res.status(201).json({ status: 'success', data: category });
};

export const deleteSeatCategory = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  
  const inUseCount = await prisma.venueSeat.count({ where: { category_id: id } });
  if (inUseCount > 0) {
    throw new BadRequestError('Cannot delete category as it is currently assigned to existing venue seats.');
  }

  await prisma.seatCategory.delete({ where: { id } });
  res.json({ status: 'success', message: 'Category deleted' });
};

export const getSeatCategories = async (req: Request, res: Response) => {
  const categories = await prisma.seatCategory.findMany({
    include: {
      _count: {
        select: { venue_seats: true }
      }
    },
    orderBy: { name: 'asc' }
  });
  res.json({ status: 'success', data: categories });
};

// --- Bulk Layout Upload / Save ---
export const createVenueSeats = async (req: Request, res: Response) => {
  const venue_id = req.params.id as string;
  const { seats } = req.body; // Array of { row_label, seat_number, category_id }

  if (!Array.isArray(seats) || seats.length === 0) {
    throw new BadRequestError('Seats array required');
  }

  // Ensure venue exists
  const venue = await prisma.venue.findUnique({ where: { id: venue_id } });
  if (!venue) throw new NotFoundError('Venue not found');

  // Replace existing seats for this venue
  await prisma.venueSeat.deleteMany({ where: { venue_id } });

  const createdSeats = await prisma.venueSeat.createMany({
    data: seats.map((seat: any) => ({
      venue_id,
      row_label: seat.row_label,
      seat_number: seat.seat_number,
      category_id: seat.category_id
    }))
  });

  res.status(201).json({
    status: 'success',
    message: `Saved ${createdSeats.count} seats for venue`,
    data: { count: createdSeats.count }
  });
};
