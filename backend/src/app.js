const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const config = require('./config');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting - Production-ready configuration
const isDevelopment = config.env === 'development';

// Rate limiting - General API (relax in dev, strict in prod)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 500 : 100,
  message: { error: 'Za dużo żądań z tego adresu IP. Spróbuj ponownie później.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment,
});

// Rate limiting - STRICT for authentication (CRITICAL for security)
// 5 login attempts per 15 minutes in production, doesn't count successful logins
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 50 : 5,
  message: { error: 'Za dużo prób logowania. Spróbuj ponownie za 15 minut.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => isDevelopment,
});

// Rate limiting - Profile endpoints
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 200 : 50,
  message: { error: 'Za dużo żądań do profilu. Spróbuj ponownie później.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment,
});

// Rate limiting - File upload endpoints (10 uploads per hour in prod)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDevelopment ? 100 : 10,
  message: { error: 'Za dużo przesłanych plików. Spróbuj ponownie za godzinę.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment,
});

// Apply rate limiters
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter); // Same strict limit as login (max 3-5 reset requests)
app.use('/api/auth/profile', profileLimiter);
app.use('/api/medical-records/*/files', uploadLimiter);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : (config.env === 'production'
      ? ['https://yourdomain.com']
      : ['http://localhost:5173', 'http://localhost:3000']);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) only in development
    if (!origin && config.env === 'development') {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'Content-Type']
}));

// Disable caching for API responses to prevent stale data issues
app.use('/api', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Body parsing middleware with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api', routes);

// 404 handler - must come after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Start email queue processor
const emailQueueService = require('./services/email-queue.service');
emailQueueService.startProcessor(30000); // Process every 30 seconds

// Cleanup old emails daily (runs on startup, then relies on external scheduler)
emailQueueService.cleanup();

module.exports = app;
