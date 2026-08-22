import { Router } from 'express';
import { register, login, verifyEmail, resendOtp } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOtp);

export default router;
