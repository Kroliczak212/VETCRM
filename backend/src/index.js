/**
 * VetCRM Backend Server
 * Main entry point
 */
const app = require('./app');
const config = require('./config');
const { pool, testConnection } = require('./config/database');

// Initialize notification system
require('./notifications/listeners/appointmentListeners');
require('./notifications/listeners/rescheduleListeners');
const { startAppointmentReminderJob } = require('./jobs/appointmentReminderJob');

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start listening
    const server = app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════╗
║   🐾 VetCRM Backend Server           ║
╠═══════════════════════════════════════╣
║  Environment: ${config.env.padEnd(20)}║
║  Port:        ${config.port.toString().padEnd(20)}║
║  API Docs:    /api-docs              ║
╚═══════════════════════════════════════╝
      `);

      // Start cron jobs for email reminders
      startAppointmentReminderJob();
      console.log('📧 Email notification system initialized');
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('\n⏹️  Shutting down gracefully...');
      server.close(() => {
        console.log('✓ HTTP server closed');
        pool.end()
          .then(() => {
            console.log('✓ Database connections closed');
            process.exit(0);
          })
          .catch((err) => {
            console.error('✗ Error closing database:', err);
            process.exit(1);
          });
      });

      // Force shutdown after 5 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
