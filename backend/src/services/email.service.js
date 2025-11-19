const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
  constructor() {
    // Create transporter (Gmail SMTP)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });
  }

  /**
   * Escape HTML to prevent XSS in email templates
   */
  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Send appointment confirmation email
   */
  async sendAppointmentConfirmation(appointment, clientEmail) {
    try {
      const mailOptions = {
        from: config.email.user,
        to: clientEmail,
        subject: 'Potwierdzenie wizyty - VetCRM',
        html: `
          <h2>Potwierdzenie wizyty</h2>
          <p>Twoja wizyta została zarezerwowana:</p>
          <ul>
            <li><strong>Data:</strong> ${this.escapeHtml(new Date(appointment.scheduled_at).toLocaleString('pl-PL'))}</li>
            <li><strong>Lekarz:</strong> ${this.escapeHtml(appointment.doctor_name)}</li>
            <li><strong>Zwierzę:</strong> ${this.escapeHtml(appointment.pet_name)}</li>
            <li><strong>Czas trwania:</strong> ${appointment.duration_minutes} minut</li>
          </ul>
          <p>Dziękujemy za skorzystanie z naszych usług!</p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      if (config.env === 'development') {
        console.log('✓ Appointment confirmation email sent to:', clientEmail);
      }
    } catch (error) {
      if (config.env === 'development') {
        console.error('✗ Failed to send appointment confirmation email:', error.message);
      }
      // Don't throw - email failures shouldn't break the main flow
    }
  }

  /**
   * Send appointment reminder (24h before)
   */
  async sendAppointmentReminder(appointment, clientEmail) {
    try {
      const mailOptions = {
        from: config.email.user,
        to: clientEmail,
        subject: 'Przypomnienie o wizycie - VetCRM',
        html: `
          <h2>Przypomnienie o jutrzejszej wizycie</h2>
          <p>Przypominamy o wizycie zaplanowanej na jutro:</p>
          <ul>
            <li><strong>Data:</strong> ${this.escapeHtml(new Date(appointment.scheduled_at).toLocaleString('pl-PL'))}</li>
            <li><strong>Lekarz:</strong> ${this.escapeHtml(appointment.doctor_name)}</li>
            <li><strong>Zwierzę:</strong> ${this.escapeHtml(appointment.pet_name)}</li>
          </ul>
          <p>W przypadku konieczności przełożenia wizyty, prosimy o kontakt.</p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      if (config.env === 'development') {
        console.log('✓ Appointment reminder email sent to:', clientEmail);
      }
    } catch (error) {
      if (config.env === 'development') {
        console.error('✗ Failed to send appointment reminder email:', error.message);
      }
    }
  }

  /**
   * Send cancellation notification
   */
  async sendAppointmentCancellation(appointment, clientEmail, reason) {
    try {
      const mailOptions = {
        from: config.email.user,
        to: clientEmail,
        subject: 'Anulowanie wizyty - VetCRM',
        html: `
          <h2>Wizyta anulowana</h2>
          <p>Informujemy, że wizyta została anulowana:</p>
          <ul>
            <li><strong>Data:</strong> ${this.escapeHtml(new Date(appointment.scheduled_at).toLocaleString('pl-PL'))}</li>
            <li><strong>Lekarz:</strong> ${this.escapeHtml(appointment.doctor_name)}</li>
            <li><strong>Zwierzę:</strong> ${this.escapeHtml(appointment.pet_name)}</li>
            ${reason ? `<li><strong>Powód:</strong> ${this.escapeHtml(reason)}</li>` : ''}
          </ul>
          <p>Zapraszamy do umówienia nowej wizyty.</p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      if (config.env === 'development') {
        console.log('✓ Appointment cancellation email sent to:', clientEmail);
      }
    } catch (error) {
      if (config.env === 'development') {
        console.error('✗ Failed to send cancellation email:', error.message);
      }
    }
  }

  /**
   * Send welcome email to new client
   */
  async sendWelcomeEmail(client, temporaryPassword) {
    try {
      const mailOptions = {
        from: config.email.user,
        to: client.email,
        subject: 'Witamy w VetCRM',
        html: `
          <h2>Witamy w VetCRM!</h2>
          <p>Twoje konto zostało utworzone.</p>
          <p><strong>Dane do logowania:</strong></p>
          <ul>
            <li><strong>Email:</strong> ${this.escapeHtml(client.email)}</li>
            <li><strong>Hasło tymczasowe:</strong> ${this.escapeHtml(temporaryPassword)}</li>
          </ul>
          <p>Prosimy o zmianę hasła po pierwszym logowaniu.</p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      if (config.env === 'development') {
        console.log('✓ Welcome email sent to:', client.email);
      }
    } catch (error) {
      if (config.env === 'development') {
        console.error('✗ Failed to send welcome email:', error.message);
      }
    }
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      if (config.env === 'development') {
        console.log('✓ Email service is ready');
      }
      return true;
    } catch (error) {
      if (config.env === 'development') {
        console.error('✗ Email service error:', error.message);
      }
      return false;
    }
  }
}

module.exports = new EmailService();
