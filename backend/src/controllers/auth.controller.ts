import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { ConflictError, UnauthorizedError, BadRequestError } from '../utils/errors';
import { Role } from '@prisma/client';
import { validateEmailFormat, sendOtpEmail } from '../utils/email';

export const register = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    throw new BadRequestError('Missing required fields');
  }

  // 1. Email format & domain validity check
  const emailValidation = validateEmailFormat(email);
  if (!emailValidation.valid) {
    throw new BadRequestError(emailValidation.reason || 'Invalid email address');
  }

  if (!Object.values(Role).includes(role)) {
    throw new BadRequestError('Invalid role');
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existingUser) {
    if (existingUser.is_verified) {
      throw new ConflictError('Email is already registered. Please log in.');
    } else {
      // If user exists but not verified, resend OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.user.update({
        where: { id: existingUser.id },
        data: { verification_otp: otp, otp_expires_at: otpExpires }
      });

      const emailResult = await sendOtpEmail(cleanEmail, otp, name);

      return res.status(200).json({
        status: 'pending_verification',
        message: 'Registration pending. Verification OTP sent to your email.',
        data: {
          email: cleanEmail,
          requires_verification: true,
          // Included for dev preview convenience
          dev_otp: process.env.NODE_ENV === 'production' ? undefined : otp,
          dev_email_preview: emailResult.previewUrl
        }
      });
    }
  }

  // 2. Generate 6-digit OTP and save pending user
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  const password_hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email: cleanEmail,
      password_hash,
      role: role as Role,
      is_verified: false,
      verification_otp: otp,
      otp_expires_at: otpExpires
    }
  });

  const emailResult = await sendOtpEmail(cleanEmail, otp, name);

  res.status(201).json({
    status: 'pending_verification',
    message: 'Verification OTP sent to your email address.',
    data: {
      email: user.email,
      requires_verification: true,
      dev_otp: process.env.NODE_ENV === 'production' ? undefined : otp,
      dev_email_preview: emailResult.previewUrl
    }
  });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new BadRequestError('Email and 6-digit OTP code required');
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

  if (!user) {
    throw new BadRequestError('User not found');
  }

  if (user.is_verified) {
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );
    return res.json({
      status: 'success',
      message: 'Email already verified.',
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token
      }
    });
  }

  if (!user.verification_otp || user.verification_otp !== otp.trim()) {
    throw new BadRequestError('Invalid verification code. Please check your email and try again.');
  }

  if (user.otp_expires_at && new Date(user.otp_expires_at) < new Date()) {
    throw new BadRequestError('Verification code has expired. Please request a new OTP.');
  }

  // Update user as verified
  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      is_verified: true,
      verification_otp: null,
      otp_expires_at: null
    }
  });

  const token = jwt.sign(
    { id: verifiedUser.id, role: verifiedUser.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );

  res.json({
    status: 'success',
    message: 'Email verified successfully! Welcome to Seatzy.',
    data: {
      user: { id: verifiedUser.id, name: verifiedUser.name, email: verifiedUser.email, role: verifiedUser.role },
      token
    }
  });
};

export const resendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new BadRequestError('Email is required');

  const cleanEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

  if (!user) throw new BadRequestError('User not found');
  if (user.is_verified) throw new BadRequestError('Account is already verified. You can log in directly.');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { verification_otp: otp, otp_expires_at: otpExpires }
  });

  const emailResult = await sendOtpEmail(cleanEmail, otp, user.name);

  res.json({
    status: 'success',
    message: 'A new 6-digit verification code has been sent to your email.',
    data: {
      email: cleanEmail,
      dev_otp: process.env.NODE_ENV === 'production' ? undefined : otp,
      dev_email_preview: emailResult.previewUrl
    }
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError('Email and password required');
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check email verification status
  if (!user.is_verified) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { verification_otp: otp, otp_expires_at: otpExpires }
    });

    const emailResult = await sendOtpEmail(cleanEmail, otp, user.name);

    return res.status(403).json({
      status: 'unverified',
      message: 'Please verify your email address before logging in.',
      requires_verification: true,
      email: user.email,
      dev_otp: process.env.NODE_ENV === 'production' ? undefined : otp,
      dev_email_preview: emailResult.previewUrl
    });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );

  res.json({
    status: 'success',
    data: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    }
  });
};
