import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';

export const getAddonItems = async (req: Request, res: Response) => {
  const addons = await prisma.addonItem.findMany({
    orderBy: { category: 'asc' }
  });
  res.json({ status: 'success', data: addons });
};

export const createAddonItem = async (req: AuthRequest, res: Response) => {
  const { name, category, price, image_url, available } = req.body;
  if (!name || !category || price === undefined) {
    throw new BadRequestError('name, category, and price are required');
  }

  const addon = await prisma.addonItem.create({
    data: {
      name,
      category: String(category).toLowerCase(),
      price: Number(price),
      image_url: image_url || null,
      available: available !== undefined ? Boolean(available) : true
    }
  });

  res.status(201).json({ status: 'success', data: addon });
};

export const updateAddonItem = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { name, category, price, image_url, available } = req.body;

  const existing = await prisma.addonItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Addon item not found');

  const updated = await prisma.addonItem.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(category && { category: String(category).toLowerCase() }),
      ...(price !== undefined && { price: Number(price) }),
      ...(image_url !== undefined && { image_url }),
      ...(available !== undefined && { available: Boolean(available) })
    }
  });

  res.json({ status: 'success', data: updated });
};

export const deleteAddonItem = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const existing = await prisma.addonItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Addon item not found');

  await prisma.addonItem.delete({ where: { id } });
  res.json({ status: 'success', message: 'Addon item deleted successfully' });
};
