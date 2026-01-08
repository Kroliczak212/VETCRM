const nodemailer = require('nodemailer');
const config = require('../config');
const emailQueueService = require('./email-queue.service');

class EmailService {
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

    // Queue non-critical emails for retry support on failures
    this.useQueue = true;
  }

  /**
   * Internal method to send or queue email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML body
   * @param {boolean} critical - If true, sends immediately; if false, uses queue
   */
  async _sendOrQueue(to, subject, html, critical = false) {
    if (critical || !this.useQueue) {
      const mailOptions = {
        from: `"${config.email.from.name}" <${config.email.from.address}>`,
        to,
        subject,
        html
      };
      await this.transporter.sendMail(mailOptions);

      if (config.env === 'development') {
        console.log(`✓ Email sent (immediate): ${subject} -> ${to}`);
      }
    } else {
      // Queue for retry support on transient failures
      await emailQueueService.enqueue(to, subject, html);
    }
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
   * Send appointment confirmation email (queued with retry)
   */
  async sendAppointmentConfirmation(appointment, clientEmail) {
    try {
      const subject = 'Potwierdzenie wizyty - VetCRM';
      const html = `
        <h2>Potwierdzenie wizyty</h2>
        <p>Twoja wizyta została zarezerwowana:</p>
        <ul>
          <li><strong>Data:</strong> ${this.escapeHtml(new Date(appointment.scheduled_at).toLocaleString('pl-PL'))}</li>
          <li><strong>Lekarz:</strong> ${this.escapeHtml(appointment.doctor_name)}</li>
          <li><strong>Zwierzę:</strong> ${this.escapeHtml(appointment.pet_name)}</li>
          <li><strong>Czas trwania:</strong> ${appointment.duration_minutes} minut</li>
        </ul>
        <p>Dziękujemy za skorzystanie z naszych usług!</p>
      `;

      await this._sendOrQueue(clientEmail, subject, html, false);
    } catch (error) {
      if (config.env === 'development') {
        console.error('✗ Failed to queue appointment confirmation email:', error.message);
      }
      // Don't throw - email failures shouldn't break the main flow
    }
  }

  /**
   * Send appointment reminder (24h before) - queued with retry
   */
  async sendAppointmentReminder(appointment, clientEmail) {
    try {
      const subject = 'Przypomnienie o wizycie - VetCRM';
      const html = `
        <h2>Przypomnienie o jutrzejszej wizycie</h2>
        <p>Przypominamy o wizycie zaplanowanej na jutro:</p>
        <ul>
          <li><strong>Data:</strong> ${this.escapeHtml(new Date(appointment.scheduled_at).toLocaleString('pl-PL'))}</li>
          <li><strong>Lekarz:</strong> ${this.escapeHtml(appointment.doctor_name)}</li>
          <li><strong>Zwierzę:</strong> ${this.escapeHtml(appointment.pet_name)}</li>
        </ul>
        <p>W przypadku konieczności przełożenia wizyty, prosimy o kontakt.</p>
      `;

      await this._sendOrQueue(clientEmail, subject, html, false);
    } catch (error) {
      if (config.env === 'development') {
        console.error('✗ Failed to queue appointment reminder email:', error.message);
      }
    }
  }

  /**
   * Send notification when receptionist reschedules appointment - queued with retry
   * @param {object} appointment - Appointment details
   * @param {string} clientEmail - Client email address
   * @param {string} oldDateTime - Original appointment date/time
   * @param {string} newDateTime - New appointment date/time
   * @param {string|null} reason - Reason for rescheduling
   * @param {object|null} doctorChange - Doctor change info { oldDoctorName, newDoctorName }
   */
  async sendAppointmentRescheduledByStaff(appointment, clientEmail, oldDateTime, newDateTime, reason = null, doctorChange = null) {
    try {
      const subject = 'Zmiana terminu wizyty - VetCRM';
      const rescheduleLink = `${config.frontendUrl}/client/appointments`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #333;
              font-size: 20px;
              margin-top: 0;
              margin-bottom: 20px;
            }
            .content p {
              margin-bottom: 15px;
              color: #555;
            }
            .appointment-box {
              background-color: #fef3c7;
              border: 2px solid #f59e0b;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
            }
            .appointment-box h3 {
              margin: 0 0 15px 0;
              color: #92400e;
              font-size: 16px;
            }
            .old-time {
              text-decoration: line-through;
              color: #dc2626;
            }
            .new-time {
              color: #059669;
              font-weight: bold;
              font-size: 18px;
            }
            .info-row {
              padding: 8px 0;
              border-bottom: 1px solid #fde68a;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #92400e;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
              text-align: center;
            }
            .info-box {
              background-color: #e0f2fe;
              border-left: 4px solid #0ea5e9;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-box p {
              margin: 0;
              color: #075985;
              font-size: 14px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px 30px;
              text-align: center;
              font-size: 13px;
              color: #6c757d;
              border-top: 1px solid #e9ecef;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Zmiana terminu wizyty</h1>
            </div>
            <div class="content">
              <h2>Szanowny Kliencie,</h2>
              <p>Informujemy, że termin Twojej wizyty został zmieniony przez recepcję.</p>

              <div class="appointment-box">
                <h3>Szczegóły zmiany:</h3>
                <div class="info-row">
                  <span class="info-label">Poprzedni termin:</span><br>
                  <span class="old-time">${this.escapeHtml(new Date(oldDateTime).toLocaleString('pl-PL', { dateStyle: 'full', timeStyle: 'short' }))}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Nowy termin:</span><br>
                  <span class="new-time">${this.escapeHtml(new Date(newDateTime).toLocaleString('pl-PL', { dateStyle: 'full', timeStyle: 'short' }))}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Lekarz:</span> ${doctorChange
                    ? `<span class="old-time">${this.escapeHtml(doctorChange.oldDoctorName)}</span> → <span class="new-time">${this.escapeHtml(doctorChange.newDoctorName)}</span>`
                    : this.escapeHtml(appointment.doctor_name)}
                </div>
                <div class="info-row">
                  <span class="info-label">Zwierzę:</span> ${this.escapeHtml(appointment.pet_name)}
                </div>
                ${reason ? `<div class="info-row"><span class="info-label">Powód zmiany:</span> ${this.escapeHtml(reason)}</div>` : ''}
              </div>

              <div class="info-box">
                <p><strong>💡 Nowy termin Ci nie odpowiada?</strong></p>
                <p>Jeśli nowy termin Ci nie pasuje, możesz zalogować się do systemu i poprosić o zmianę terminu lub skontaktować się z recepcją.</p>
              </div>

              <div style="text-align: center;">
                <a href="${rescheduleLink}" class="button">Przejdź do moich wizyt</a>
              </div>

              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Przepraszamy za wszelkie niedogodności i dziękujemy za zrozumienie.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} VetCRM. Wszystkie prawa zastrzeżone.</p>
              <p>Ta wiadomość została wygenerowana automatycznie. Prosimy nie odpowiadać.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this._sendOrQueue(clientEmail, subject, html, false);
    } catch (error) {
      if (config.env === 'development') {
        console.error('✗ Failed to queue reschedule notification email:', error.message);
      }
    }
  }

  /**
   * Send cancellation notification - queued with retry
   */
  async sendAppointmentCancellation(appointment, clientEmail, reason) {
    try {
      const subject = 'Anulowanie wizyty - VetCRM';
      const html = `
        <h2>Wizyta anulowana</h2>
        <p>Informujemy, że wizyta została anulowana:</p>
        <ul>
          <li><strong>Data:</strong> ${this.escapeHtml(new Date(appointment.scheduled_at).toLocaleString('pl-PL'))}</li>
          <li><strong>Lekarz:</strong> ${this.escapeHtml(appointment.doctor_name)}</li>
          <li><strong>Zwierzę:</strong> ${this.escapeHtml(appointment.pet_name)}</li>
          ${reason ? `<li><strong>Powód:</strong> ${this.escapeHtml(reason)}</li>` : ''}
        </ul>
        <p>Zapraszamy do umówienia nowej wizyty.</p>
      `;

      await this._sendOrQueue(clientEmail, subject, html, false);
    } catch (error) {
      if (config.env === 'development') {
        console.error('✗ Failed to queue cancellation email:', error.message);
      }
    }
  }

  /**
   * Send welcome email to new client with login credentials
   */
  async sendWelcomeEmail(client, temporaryPassword) {
    try {
      const loginLink = `${config.frontendUrl}/login`;

      const mailOptions = {
        from: `"${config.email.from.name}" <${config.email.from.address}>`,
        to: client.email,
        subject: 'Witamy w VetCRM!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                margin: 0 0 10px 0;
                font-size: 28px;
                font-weight: 600;
              }
              .header p {
                margin: 0;
                font-size: 16px;
                opacity: 0.95;
              }
              .content {
                padding: 40px 30px;
              }
              .content h2 {
                color: #333;
                font-size: 20px;
                margin-top: 0;
                margin-bottom: 20px;
              }
              .content p {
                margin-bottom: 15px;
                color: #555;
              }
              .credentials-box {
                background-color: #f8f9fa;
                border: 2px solid #10b981;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
              }
              .credentials-box h3 {
                margin: 0 0 15px 0;
                color: #059669;
                font-size: 16px;
              }
              .credentials-box .credential-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #e9ecef;
              }
              .credentials-box .credential-item:last-child {
                border-bottom: none;
              }
              .credentials-box .credential-label {
                font-weight: 600;
                color: #666;
              }
              .credentials-box .credential-value {
                font-family: 'Courier New', monospace;
                background: white;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 14px;
                color: #059669;
                font-weight: 600;
              }
              .button {
                display: inline-block;
                padding: 14px 32px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 600;
                text-align: center;
              }
              .info-box {
                background-color: #e0f2fe;
                border-left: 4px solid #0ea5e9;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .info-box strong {
                color: #075985;
                display: block;
                margin-bottom: 8px;
              }
              .info-box p {
                margin: 0;
                color: #075985;
                font-size: 14px;
              }
              .steps {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
              }
              .steps h3 {
                margin: 0 0 15px 0;
                color: #333;
                font-size: 16px;
              }
              .steps ol {
                margin: 0;
                padding-left: 20px;
              }
              .steps li {
                margin-bottom: 10px;
                color: #555;
              }
              .footer {
                background: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                font-size: 13px;
                color: #6c757d;
                border-top: 1px solid #e9ecef;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🐾 Witamy w VetCRM!</h1>
                <p>Twoje konto zostało utworzone pomyślnie</p>
              </div>
              <div class="content">
                <h2>Cześć ${this.escapeHtml(client.first_name)}!</h2>
                <p>Cieszymy się, że dołączasz do naszego systemu zarządzania kliniką weterynaryjną. Twoje konto zostało utworzone i możesz już się zalogować.</p>

                <div class="credentials-box">
                  <h3>📧 Twoje dane do logowania:</h3>
                  <div class="credential-item">
                    <span class="credential-label">Email:</span>
                    <span class="credential-value">${this.escapeHtml(client.email)}</span>
                  </div>
                  <div class="credential-item">
                    <span class="credential-label">Hasło tymczasowe:</span>
                    <span class="credential-value">${this.escapeHtml(temporaryPassword)}</span>
                  </div>
                </div>

                <div class="info-box">
                  <strong>🔒 Ważne: Zmiana hasła</strong>
                  <p>Ze względów bezpieczeństwa, po pierwszym logowaniu zostaniesz poproszony o zmianę hasła na własne, bezpieczne hasło.</p>
                </div>

                <div class="steps">
                  <h3>Jak zacząć:</h3>
                  <ol>
                    <li>Kliknij przycisk "Zaloguj się" poniżej</li>
                    <li>Wpisz swój email i hasło tymczasowe</li>
                    <li>Ustaw nowe, bezpieczne hasło</li>
                    <li>Gotowe! Możesz korzystać z systemu</li>
                  </ol>
                </div>

                <div style="text-align: center;">
                  <a href="${loginLink}" class="button">Zaloguj się teraz</a>
                </div>

                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                  W VetCRM możesz:
                </p>
                <ul style="color: #666; font-size: 14px;">
                  <li>Zarządzać danymi swoich zwierząt</li>
                  <li>Umawiać wizyty weterynaryjne</li>
                  <li>Przeglądać historię leczenia</li>
                  <li>Otrzymywać przypomnienia o wizytach i szczepieniach</li>
                </ul>

                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                  Jeśli masz pytania lub potrzebujesz pomocy, skontaktuj się z naszym zespołem.
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} VetCRM. Wszystkie prawa zastrzeżone.</p>
                <p>Ta wiadomość została wygenerowana automatycznie. Prosimy nie odpowiadać.</p>
              </div>
            </div>
          </body>
          </html>
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
      throw error; // Throw for welcome email (important for new users)
    }
  }

  /**
   * Send password reset email with secure token link
   */
  async sendPasswordResetEmail(user, resetToken) {
    try {
      const resetLink = `${config.frontendUrl}/reset-password?token=${resetToken}`;
      const expiryTime = '1 godzinę';

      const mailOptions = {
        from: `"${config.email.from.name}" <${config.email.from.address}>`,
        to: user.email,
        subject: 'Reset hasła - VetCRM',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
              }
              .content {
                padding: 40px 30px;
              }
              .content h2 {
                color: #333;
                font-size: 20px;
                margin-top: 0;
                margin-bottom: 20px;
              }
              .content p {
                margin-bottom: 15px;
                color: #555;
              }
              .button {
                display: inline-block;
                padding: 14px 32px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 600;
                text-align: center;
              }
              .button:hover {
                opacity: 0.9;
              }
              .warning-box {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .warning-box strong {
                color: #856404;
                display: block;
                margin-bottom: 8px;
              }
              .warning-box p {
                margin: 0;
                color: #856404;
                font-size: 14px;
              }
              .footer {
                background: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                font-size: 13px;
                color: #6c757d;
                border-top: 1px solid #e9ecef;
              }
              .link {
                color: #667eea;
                word-break: break-all;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🐾 VetCRM</h1>
              </div>
              <div class="content">
                <h2>Reset hasła</h2>
                <p>Witaj ${this.escapeHtml(user.first_name)},</p>
                <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w VetCRM.</p>
                <p>Aby ustawić nowe hasło, kliknij poniższy przycisk:</p>

                <div style="text-align: center;">
                  <a href="${resetLink}" class="button">Resetuj hasło</a>
                </div>

                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  Jeśli przycisk nie działa, skopiuj i wklej poniższy link do przeglądarki:
                </p>
                <p class="link">${resetLink}</p>

                <div class="warning-box">
                  <strong>⚠️ Ważne informacje bezpieczeństwa:</strong>
                  <p>• Link jest ważny przez <strong>${expiryTime}</strong></p>
                  <p>• Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość</p>
                  <p>• Nigdy nie udostępniaj tego linku innym osobom</p>
                  <p>• Po użyciu link stanie się nieważny</p>
                </div>

                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                  Jeśli masz pytania, skontaktuj się z naszym zespołem wsparcia.
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} VetCRM. Wszystkie prawa zastrzeżone.</p>
                <p>Ta wiadomość została wygenerowana automatycznie. Prosimy nie odpowiadać.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      if (config.env === 'development') {
        console.log('✓ Password reset email sent to:', user.email);
      }
    } catch (error) {
      if (config.env === 'development') {
        console.error('✗ Failed to send password reset email:', error.message);
      }
      throw error; // Important: throw for password reset (critical operation)
    }
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetConfirmation(user) {
    try {
      const loginLink = `${config.frontendUrl}/login`;

      const mailOptions = {
        from: `"${config.email.from.name}" <${config.email.from.address}>`,
        to: user.email,
        subject: 'Hasło zostało zmienione - VetCRM',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 30px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
              }
              .content {
                padding: 40px 30px;
              }
              .content h2 {
                color: #333;
                font-size: 20px;
                margin-top: 0;
                margin-bottom: 20px;
              }
              .content p {
                margin-bottom: 15px;
                color: #555;
              }
              .success-box {
                background-color: #d4edda;
                border-left: 4px solid #28a745;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                text-align: center;
              }
              .success-box strong {
                color: #155724;
                font-size: 18px;
                display: block;
                margin-bottom: 5px;
              }
              .button {
                display: inline-block;
                padding: 14px 32px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 600;
                text-align: center;
              }
              .warning-box {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .warning-box p {
                margin: 0;
                color: #856404;
                font-size: 14px;
              }
              .footer {
                background: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                font-size: 13px;
                color: #6c757d;
                border-top: 1px solid #e9ecef;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🐾 VetCRM</h1>
              </div>
              <div class="content">
                <h2>Hasło zostało zmienione</h2>
                <p>Witaj ${this.escapeHtml(user.first_name)},</p>

                <div class="success-box">
                  <strong>✅ Sukces!</strong>
                  <p style="margin: 5px 0 0 0; color: #155724;">Twoje hasło zostało pomyślnie zmienione.</p>
                </div>

                <p>Hasło do Twojego konta VetCRM zostało właśnie zaktualizowane.</p>
                <p>Możesz teraz zalogować się używając nowego hasła:</p>

                <div style="text-align: center;">
                  <a href="${loginLink}" class="button">Przejdź do logowania</a>
                </div>

                <div class="warning-box">
                  <p><strong>⚠️ Nie zmieniałeś hasła?</strong></p>
                  <p>Jeśli to nie Ty zmieniłeś hasło, natychmiast skontaktuj się z naszym zespołem wsparcia. Twoje konto może być zagrożone.</p>
                </div>

                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                  <strong>Data zmiany:</strong> ${new Date().toLocaleString('pl-PL', {
                    timeZone: 'Europe/Warsaw',
                    dateStyle: 'long',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} VetCRM. Wszystkie prawa zastrzeżone.</p>
                <p>Ta wiadomość została wygenerowana automatycznie. Prosimy nie odpowiadać.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      if (config.env === 'development') {
        console.log('✓ Password reset confirmation email sent to:', user.email);
      }
    } catch (error) {
      if (config.env === 'development') {
        console.error('✗ Failed to send password reset confirmation:', error.message);
      }
      // Don't throw - confirmation email failure shouldn't break the flow
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
