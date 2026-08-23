import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  resendOtp,
  requestOtpLogin,
  verifyOtpLogin,
  resetPasswordWithOtp,
  getProfile,
  updateProfile,
  changePassword,
  testSmtp
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOtp);
router.post('/request-otp-login', requestOtpLogin);
router.post('/verify-otp-login', verifyOtpLogin);
router.post('/reset-password-otp', resetPasswordWithOtp);

// Authenticated user settings routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

// SMTP diagnostic — remove in production or restrict with admin auth
router.get('/test-smtp', testSmtp);

export default router;
