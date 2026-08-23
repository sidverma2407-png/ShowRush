import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/seatzy?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, seat_count, seat_subtotal, addons_subtotal = 0 } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Coupon code is required' });
      return;
    }

    const numSeatCount = Number(seat_count) || 0;
    const numSeatSubtotal = Number(seat_subtotal) || 0;
    const numAddonsSubtotal = Number(addons_subtotal) || 0;

    // 1. Group Discount: Applied FIRST to total seat subtotal
    const groupDiscountAmount = numSeatCount >= 5 ? Math.round(numSeatSubtotal * 0.10 * 100) / 100 : 0;
    const reducedSeatSubtotal = Math.max(0, numSeatSubtotal - groupDiscountAmount);
    const totalCartSubtotal = reducedSeatSubtotal + numAddonsSubtotal;

    // Fetch Coupon
    const formattedCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: formattedCode }
    });

    if (!coupon) {
      res.status(404).json({ error: 'Invalid coupon code' });
      return;
    }

    // 2. Enforce all 4 strict validation conditions
    // Condition A: Active status
    if (!coupon.is_active) {
      res.status(400).json({ error: 'This promo code is currently inactive' });
      return;
    }

    // Condition B: Expiry date check
    if (coupon.expires_at && coupon.expires_at < new Date()) {
      res.status(400).json({ error: 'This promo code has expired' });
      return;
    }

    // Condition C: Usage limit check
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      res.status(400).json({ error: 'This promo code has reached its maximum usage limit' });
      return;
    }

    // Condition D: Minimum cart amount requirement
    if (coupon.min_amount !== null && totalCartSubtotal < Number(coupon.min_amount)) {
      res.status(400).json({
        error: `Minimum subtotal of ₹${coupon.min_amount} is required for code ${coupon.code}`
      });
      return;
    }

    // Calculate coupon discount against the reduced seat subtotal (or total cart if applicable)
    let couponDiscountAmount = 0;
    const discountVal = Number(coupon.discount_value);

    if (coupon.discount_type === 'percentage') {
      couponDiscountAmount = Math.round((reducedSeatSubtotal * (discountVal / 100)) * 100) / 100;
    } else {
      couponDiscountAmount = Math.min(reducedSeatSubtotal, discountVal);
    }

    res.json({
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: discountVal,
      group_discount_amount: groupDiscountAmount,
      coupon_discount_amount: couponDiscountAmount,
      message: `Promo code ${coupon.code} applied successfully!`
    });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ error: 'Failed to validate coupon code' });
  }
};

export const getCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(coupons);
  } catch (error: any) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
};

export const createCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, discount_type, discount_value, max_uses, min_amount, expires_at, is_active } = req.body;

    if (!code || !discount_value) {
      res.status(400).json({ error: 'Code and discount_value are required' });
      return;
    }

    const formattedCode = code.trim().toUpperCase();

    const existing = await prisma.coupon.findUnique({ where: { code: formattedCode } });
    if (existing) {
      res.status(400).json({ error: 'A coupon with this code already exists' });
      return;
    }

    const userId = (req as any).user?.userId;

    const coupon = await prisma.coupon.create({
      data: {
        code: formattedCode,
        discount_type: discount_type === 'flat' ? 'flat' : 'percentage',
        discount_value: Number(discount_value),
        max_uses: max_uses !== undefined && max_uses !== null ? Number(max_uses) : null,
        min_amount: min_amount !== undefined && min_amount !== null ? Number(min_amount) : null,
        expires_at: expires_at ? new Date(expires_at) : null,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        created_by: userId || null
      }
    });

    res.status(201).json(coupon);
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

export const updateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const couponId = req.params.id as string;
    const { is_active, max_uses, discount_value, min_amount, expires_at } = req.body;

    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }

    const updateData: any = {};
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
    if (max_uses !== undefined) updateData.max_uses = max_uses !== null ? Number(max_uses) : null;
    if (discount_value !== undefined) updateData.discount_value = Number(discount_value);
    if (min_amount !== undefined) updateData.min_amount = min_amount !== null ? Number(min_amount) : null;
    if (expires_at !== undefined) updateData.expires_at = expires_at ? new Date(expires_at) : null;

    const updatedCoupon = await prisma.coupon.update({
      where: { id: couponId },
      data: updateData
    });

    res.json(updatedCoupon);
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
};
