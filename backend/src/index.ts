import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import organiserRoutes from './routes/organiser.routes';
import customerRoutes from './routes/customer.routes';
import { errorHandler } from './middleware/errorHandler';
import { startScheduler } from './jobs/scheduler';

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173'
];

// Setup Socket.IO with dynamic CORS fallback
export const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for production deployment
      }
    },
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', organiserRoutes);
app.use('/api', customerRoutes);

// Basic health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Error handling (must be last)
app.use(errorHandler);

// Start scheduler
startScheduler();

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
