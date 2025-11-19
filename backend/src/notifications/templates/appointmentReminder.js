const { format } = require('date-fns');
const { pl } = require('date-fns/locale');

/**
 * Appointment Reminder Email Template
 * Used for both 24h and 2h reminders
 */

const generate = ({ userName, petName, doctorName, scheduledAt, reason, location, hoursUntil }) => {
  const formattedDate = format(new Date(scheduledAt), "dd MMMM yyyy 'o' HH:mm", { locale: pl });
  const timeLabel = hoursUntil >= 24 ? '24 godzinach' : '2 godzinach';
  const urgencyIcon = hoursUntil >= 24 ? '⏰' : '🔔';

  const subject = `${urgencyIcon} Przypomnienie: Wizyta za ${timeLabel} - ${petName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); color: #333; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .detail-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #fcb69f; border-radius: 5px; }
    .highlight-box { background: #fff3e0; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; border: 2px dashed #ff9800; }
    .time-display { font-size: 32px; font-weight: bold; color: #ff9800; margin: 10px 0; }
    .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${urgencyIcon} Przypomnienie o Wizycie</h1>
    </div>
    <div class="content">
      <p>Witaj <strong>${userName}</strong>,</p>

      <p>Przypominamy o nadchodzącej wizycie Twojego pupila w VetCRM!</p>

      <div class="highlight-box">
        <p style="font-size: 18px; margin: 0;">Wizyta za:</p>
        <div class="time-display">${timeLabel.toUpperCase()}</div>
      </div>

      <div class="detail-box">
        <h3>📋 Szczegóły wizyty:</h3>
        <p><strong>Pupil:</strong> ${petName}</p>
        <p><strong>Lekarz:</strong> ${doctorName}</p>
        <p><strong>Data i godzina:</strong> ${formattedDate}</p>
        ${reason ? `<p><strong>Powód wizyty:</strong> ${reason}</p>` : ''}
        ${location ? `<p><strong>Lokalizacja:</strong> ${location}</p>` : ''}
      </div>

      <p><strong>Przed wizytą:</strong></p>
      <ul>
        <li>Przybyj 10 minut wcześniej, aby spokojnie wypełnić formalności</li>
        <li>Jeśli masz jakiekolwiek pytania, skontaktuj się z nami</li>
        <li>W razie nagłej potrzeby odwołania, zadzwoń do recepcji</li>
        ${hoursUntil >= 24 ? '<li>Pamiętaj, że możesz jeszcze zmienić termin w panelu klienta</li>' : '<li>Aby zmienić termin, skontaktuj się telefonicznie</li>'}
      </ul>

      <p>Do zobaczenia wkrótce! ${petName} jest w dobrych rękach. 🐾</p>

      <div class="footer">
        <p>VetCRM - Kompleksowa opieka nad Twoimi pupilami</p>
        <p>Tel: +48 123 456 789 | Email: kontakt@vetcrm.pl</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
};

module.exports = { generate };
