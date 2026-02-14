import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { healthRoutes } from './routes/health';
import { apiRoutes } from './routes/api';
import { swaggerOptions, swaggerUiOptions } from './config/swagger';
import { connectDB, disconnectDB } from './db';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ============================================
// MIDDLEWARE
// ============================================

// Swagger UI
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Swagger JSON endpoint
app.get('/api-docs/swagger.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging middleware
app.use(morgan('combined'));
app.use(requestLogger);

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.use('/health', healthRoutes);

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

/**
 * Start server and connect to MongoDB
 */
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`
    ╔════════════════════════════════════════╗
    ║  Express Server Started Successfully!  ║
    ║  ✓ Server running on port ${PORT}         ║
    ║  ✓ Environment: ${process.env.NODE_ENV}            ║
    ║  ✓ CORS enabled: ${process.env.CORS_ORIGIN}                     ║
    ║  ✓ Database connected                  ║
    ╚════════════════════════════════════════╝
  `);
    });

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} signal received: closing application`);
      
      server.close(async () => {
        try {
          await disconnectDB();
          console.log('✅ Application shutdown successfully');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
