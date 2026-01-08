const { pool } = require('../config/database');
const nodemailer = require('nodemailer');
const config = require('../config');

/**
 * Email Queue Service with retry mechanism
 * Uses database-backed queue for reliability
 */
class EmailQueueService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });

    this.isProcessing = false;
    this.processingInterval = null;
    this.RETRY_DELAYS = [60, 300, 900]; // 1min, 5min, 15min (exponential backoff)
  }

  /**
   * Add email to queue
   * @param {string} toEmail - Recipient email
   * @param {string} subject - Email subject
   * @param {string} htmlBody - Email HTML body
   * @param {number} maxRetries - Max retry attempts (default: 3)
   * @returns {Promise<number>} Queue entry ID
   */
  async enqueue(toEmail, subject, htmlBody, maxRetries = 3) {
    const [result] = await pool.query(
      `INSERT INTO email_queue (to_email, subject, html_body, max_retries, status, next_retry_at)
       VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [toEmail, subject, htmlBody, maxRetries]
    );

    if (config.env === 'development') {
      console.log(`📧 Email queued: ${subject} -> ${toEmail} (ID: ${result.insertId})`);
    }

    return result.insertId;
  }

  /**
   * Send email immediately (bypass queue) - for critical emails
   * @param {string} toEmail
   * @param {string} subject
   * @param {string} htmlBody
   */
  async sendImmediate(toEmail, subject, htmlBody) {
    const mailOptions = {
      from: `"${config.email.from.name}" <${config.email.from.address}>`,
      to: toEmail,
      subject,
      html: htmlBody
    };

    await this.transporter.sendMail(mailOptions);

    if (config.env === 'development') {
      console.log(`✓ Email sent immediately: ${subject} -> ${toEmail}`);
    }
  }

  /**
   * Process pending emails in queue
   */
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const [emails] = await pool.query(
        `SELECT * FROM email_queue
         WHERE status = 'pending'
         AND (next_retry_at IS NULL OR next_retry_at <= NOW())
         ORDER BY created_at ASC
         LIMIT 10`
      );

      for (const email of emails) {
        await this.processEmail(email);
      }
    } catch (error) {
      console.error('Email queue processing error:', error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process single email
   * @param {object} email - Email record from queue
   */
  async processEmail(email) {
    try {
      const mailOptions = {
        from: `"${config.email.from.name}" <${config.email.from.address}>`,
        to: email.to_email,
        subject: email.subject,
        html: email.html_body
      };

      await this.transporter.sendMail(mailOptions);

      await pool.query(
        `UPDATE email_queue SET status = 'sent', sent_at = NOW(), error_message = NULL WHERE id = ?`,
        [email.id]
      );

      if (config.env === 'development') {
        console.log(`✓ Email sent: ${email.subject} -> ${email.to_email}`);
      }
    } catch (error) {
      await this.handleEmailError(email, error);
    }
  }

  /**
   * Handle email sending error with retry logic
   * @param {object} email - Email record
   * @param {Error} error - Error that occurred
   */
  async handleEmailError(email, error) {
    const newRetryCount = email.retry_count + 1;

    if (newRetryCount >= email.max_retries) {
      await pool.query(
        `UPDATE email_queue
         SET status = 'failed', retry_count = ?, error_message = ?
         WHERE id = ?`,
        [newRetryCount, error.message, email.id]
      );

      console.error(`✗ Email failed permanently: ${email.subject} -> ${email.to_email}: ${error.message}`);
    } else {
      // Schedule retry with exponential backoff
      const delaySeconds = this.RETRY_DELAYS[newRetryCount - 1] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];

      await pool.query(
        `UPDATE email_queue
         SET retry_count = ?, error_message = ?, next_retry_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
         WHERE id = ?`,
        [newRetryCount, error.message, delaySeconds, email.id]
      );

      if (config.env === 'development') {
        console.log(`⏳ Email retry scheduled: ${email.subject} -> ${email.to_email} (attempt ${newRetryCount + 1}/${email.max_retries}, delay: ${delaySeconds}s)`);
      }
    }
  }

  /**
   * Start queue processor (runs every 30 seconds)
   */
  startProcessor(intervalMs = 30000) {
    if (this.processingInterval) {
      return; // Already running
    }

    // Process immediately on start
    this.processQueue();

    // Then process at interval
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, intervalMs);

    if (config.env === 'development') {
      console.log(`📧 Email queue processor started (interval: ${intervalMs / 1000}s)`);
    }
  }

  /**
   * Stop queue processor
   */
  stopProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('📧 Email queue processor stopped');
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM email_queue
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    return stats[0];
  }

  /**
   * Clean up old sent emails (keep last 7 days)
   */
  async cleanup() {
    const [result] = await pool.query(
      `DELETE FROM email_queue
       WHERE status = 'sent' AND sent_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    if (result.affectedRows > 0 && config.env === 'development') {
      console.log(`🧹 Cleaned up ${result.affectedRows} old email records`);
    }

    return result.affectedRows;
  }

  /**
   * Retry failed emails (manual trigger)
   */
  async retryFailed() {
    const [result] = await pool.query(
      `UPDATE email_queue
       SET status = 'pending', retry_count = 0, next_retry_at = NOW()
       WHERE status = 'failed'`
    );

    return result.affectedRows;
  }
}

module.exports = new EmailQueueService();
