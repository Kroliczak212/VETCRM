/**
 * VetCRM Backend Server
 * Main entry point
 */
const app = require('./app');
const config = require('./config');
const { pool, testConnection } = require('./config/database');

require('./notifications/listeners/appointmentListeners');
require('./notifications/listeners/rescheduleListeners');
const { startAppointmentReminderJob } = require('./jobs/appointmentReminderJob');

const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

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

      startAppointmentReminderJob();
      console.log('📧 Email notification system initialized');
    });

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

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
