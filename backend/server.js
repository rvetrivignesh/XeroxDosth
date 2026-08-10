import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';

import connectDB from './src/config/db.js';
import { globalRateLimiter } from './src/middleware/rateLimiter.middleware.js';
import { errorHandler } from './src/middleware/error.middleware.js';

import authRoutes from './src/routes/auth/auth.routes.js';
import applicationRoutes from './src/routes/applications/application.routes.js';
import shopRoutes from './src/routes/shop.routes.js';
import orderRoutes from './src/routes/order.routes.js';
import uploadRoutes from './src/routes/upload.routes.js';
import notificationRoutes from './src/routes/notification.routes.js';
import ApiError from './src/utils/ApiError.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Uncaught Exception handler
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! Shutting down server...');
    console.error(err.name, err.message);
    console.error(err.stack);
    process.exit(1);
});

// Connect to MongoDB
connectDB();

const app = express();

const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: (origin, callback) => {
            callback(null, true);
        },
        credentials: true
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('🔌 Socket client connected:', socket.id);

    socket.on('join', (userId) => {
        if (userId) {
            socket.join(userId.toString());
            console.log(`👤 User joined room: ${userId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Socket client disconnected:', socket.id);
    });
});

// Trust proxy for rate limiter behind load balancers/proxies
app.set('trust proxy', 1);

// Helmet for security HTTP headers
app.use(helmet());

// CORS configuration - support frontend dev servers & environment URLs
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, postman) or matching allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Fallback allow in dev
        return callback(null, true);
    },
    credentials: true
}));

// Logger using Morgan
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Body parsing with limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Gzip compression
app.use(compression());

// Apply global rate limiter to all /api routes
app.use('/api', globalRateLimiter);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// Catch 404 (non-existent routes)
app.all('*all', (req, res, next) => {
    next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4001; // Match environment settings

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Unhandled Rejection handler
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down server gracefully...');
    console.error(err.name, err.message);
    console.error(err.stack);
    server.close(() => {
        process.exit(1);
    });
});

export default app;
