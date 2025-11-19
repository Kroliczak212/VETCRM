/**
 * Email Configuration
 * Brevo SMTP settings from environment variables
 */

module.exports = {
  smtp: {
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || 'VetCRM',
    address: process.env.EMAIL_FROM_ADDRESS || 'noreply@vetcrm.pl',
  },
  // Global flag to enable/disable email sending (useful for dev/test)
  sendEnabled: process.env.EMAIL_SEND_ENABLED !== 'false',
};
