import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/api.routes';
import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rate-limit.middleware';

const app = express();

// Security Headers - helmet adds various HTTP headers for security
app.use(helmet());

// CORS - Restrict to specific origins in production
const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Log origin for debugging
        if (process.env.NODE_ENV === 'development') {
            console.log(`[CORS] Incoming origin: ${origin}`);
            return callback(null, true); // Allow all in dev
        }

        const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
            ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
            : ['http://localhost:3000'];

        // Allow requests with no origin (mobile apps, curl, postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parser with size limits to prevent large payload attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting - Apply to all requests
app.use(rateLimiter);

// Health check endpoint (no authentication required)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api', apiRoutes);

// Error Handling (must be last)
app.use(errorHandler);

export default app;
