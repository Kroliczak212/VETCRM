const nodemailer = require('nodemailer');
const emailConfig = require('../config/email.config');

/**
 * Email Service - Nodemailer Transporter
 * Singleton pattern - create transporter once
 */

let transporter = null;

/**
 * Get or create email transporter
 */
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport(emailConfig.smtp);

    // Verify connection on creation (optional, useful for debugging)
    if (emailConfig.sendEnabled) {
      transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email transporter verification failed:', error);
        } else {
          console.log('✅ Email server is ready to send messages');
        }
      });
    }
  }
  return transporter;
};

/**
 * Send email
 * @param {Object} mailOptions - Email options (to, subject, html, etc.)
 * @returns {Promise} - Nodemailer sendMail promise
 */
const sendEmail = async (mailOptions) => {
  if (!emailConfig.sendEnabled) {
    console.log('📧 [DEV MODE] Email sending disabled. Would have sent:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
    });
    return { messageId: 'dev-mode-disabled' };
  }

  if (!mailOptions.from) {
    mailOptions.from = `"${emailConfig.from.name}" <${emailConfig.from.address}>`;
  }

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log('✅ Email sent successfully:', {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  getTransporter,
};
