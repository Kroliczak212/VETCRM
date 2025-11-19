const { format } = require('date-fns');
const { pl } = require('date-fns/locale');

/**
 * Appointment Confirmed Email Template
 */

const generate = ({ userName, petName, doctorName, scheduledAt, reason, location }) => {
  const formattedDate = format(new Date(scheduledAt), "dd MMMM yyyy 'o' HH:mm", { locale: pl });

  const subject = `✅ Wizyta potwierdzona - ${petName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .detail-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Wizyta Potwierdzona!</h1>
    </div>
    <div class="content">
      <p>Witaj <strong>${userName}</strong>,</p>

      <p>Cieszymy się, że możemy potwierdzić Twoją wizytę w VetCRM!</p>

      <div class="detail-box">
        <h3>📋 Szczegóły wizyty:</h3>
        <p><strong>Pupil:</strong> ${petName}</p>
        <p><strong>Lekarz:</strong> ${doctorName}</p>
        <p><strong>Data i godzina:</strong> ${formattedDate}</p>
        ${reason ? `<p><strong>Powód:</strong> ${reason}</p>` : ''}
        ${location ? `<p><strong>Lokalizacja:</strong> ${location}</p>` : ''}
      </div>

      <p><strong>Co dalej?</strong></p>
      <ul>
        <li>Otrzymasz przypomnienie 24 godziny przed wizytą</li>
        <li>Prosimy o przybycie 10 minut przed umówionym czasem</li>
        <li>W razie pytań, skontaktuj się z nami telefonicznie</li>
      </ul>

      <p>W razie potrzeby możesz zmienić termin lub anulować wizytę przez panel klienta.</p>

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
