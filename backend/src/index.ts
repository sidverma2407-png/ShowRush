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

// Setup Socket.IO
export const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', adminRoutes); // admin endpoints are defined directly e.g. /venues
app.use('/api', organiserRoutes); // organiser endpoints e.g. /events
app.use('/api', customerRoutes); // customer endpoints

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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
