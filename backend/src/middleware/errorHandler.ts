import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Always log the full error in dev for debugging
  console.error('[ERROR]', err.name, err.message);
  if ((err as any).meta) console.error('[PRISMA META]', (err as any).meta);
  if ((err as any).code) console.error('[CODE]', (err as any).code);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      status: 'error',
      message: 'Database operation failed',
      details: (err as any).meta
    });
  }

  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};
