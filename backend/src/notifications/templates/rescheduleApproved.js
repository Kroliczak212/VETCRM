const { format } = require('date-fns');
const { pl } = require('date-fns/locale');

/**
 * Reschedule Approved Email Template
 */

const generate = ({ userName, petName, doctorName, oldScheduledAt, newScheduledAt, reason }) => {
  const oldDate = format(new Date(oldScheduledAt), "dd MMMM yyyy 'o' HH:mm", { locale: pl });
  const newDate = format(new Date(newScheduledAt), "dd MMMM yyyy 'o' HH:mm", { locale: pl });

  const subject = `✅ Zmiana terminu zatwierdzona - ${petName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .detail-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4facfe; border-radius: 5px; }
    .change-box { background: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: center; }
    .old-date { text-decoration: line-through; color: #999; }
    .new-date { color: #4facfe; font-weight: bold; font-size: 18px; }
    .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Zmiana Terminu Zatwierdzona!</h1>
    </div>
    <div class="content">
      <p>Witaj <strong>${userName}</strong>,</p>

      <p>Twoja prośba o zmianę terminu wizyty została zaakceptowana!</p>

      <div class="change-box">
        <p class="old-date">${oldDate}</p>
        <p style="font-size: 24px; margin: 10px 0;">⬇️</p>
        <p class="new-date">${newDate}</p>
      </div>

      <div class="detail-box">
        <h3>📋 Nowe szczegóły wizyty:</h3>
        <p><strong>Pupil:</strong> ${petName}</p>
        <p><strong>Lekarz:</strong> ${doctorName}</p>
        <p><strong>Nowy termin:</strong> ${newDate}</p>
        ${reason ? `<p><strong>Powód wizyty:</strong> ${reason}</p>` : ''}
      </div>

      <p><strong>Pamiętaj:</strong></p>
      <ul>
        <li>Nowy termin został automatycznie zapisany w systemie</li>
        <li>Otrzymasz przypomnienie 24 godziny przed wizytą</li>
        <li>Prosimy o przybycie 10 minut przed umówionym czasem</li>
      </ul>

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
