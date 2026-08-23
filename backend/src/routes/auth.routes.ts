import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  resendOtp,
  requestOtpLogin,
  verifyOtpLogin,
  resetPasswordWithOtp
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOtp);
router.post('/request-otp-login', requestOtpLogin);
router.post('/verify-otp-login', verifyOtpLogin);
router.post('/reset-password-otp', resetPasswordWithOtp);

export default router;

