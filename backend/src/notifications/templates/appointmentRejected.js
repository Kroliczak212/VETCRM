const { format } = require('date-fns');
const { pl } = require('date-fns/locale');

/**
 * Appointment Rejected Email Template
 */

const generate = ({ userName, petName, doctorName, scheduledAt, rejectionReason }) => {
  const formattedDate = format(new Date(scheduledAt), "dd MMMM yyyy 'o' HH:mm", { locale: pl });

  const subject = `❌ Wizyta niepotwier dzona - ${petName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .detail-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #f5576c; border-radius: 5px; }
    .warning-box { background: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; border-radius: 5px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Wizyta Niepo twierdzona</h1>
    </div>
    <div class="content">
      <p>Witaj <strong>${userName}</strong>,</p>

      <p>Niestety, nie możemy potwierdzić Twojej propozycji wizyty.</p>

      <div class="detail-box">
        <h3>📋 Szczegóły propozycji:</h3>
        <p><strong>Pupil:</strong> ${petName}</p>
        <p><strong>Lekarz:</strong> ${doctorName}</p>
        <p><strong>Proponowana data:</strong> ${formattedDate}</p>
      </div>

      ${rejectionReason ? `
      <div class="warning-box">
        <h4>⚠️ Powód odrzucenia:</h4>
        <p>${rejectionReason}</p>
      </div>
      ` : ''}

      <p><strong>Co możesz zrobić?</strong></p>
      <ul>
        <li>Zaproponuj inny termin w panelu klienta</li>
        <li>Skontaktuj się z naszą recepcją, aby znaleźć odpowiedni termin</li>
        <li>Sprawdź dostępne godziny w kalendarzu online</li>
      </ul>

      <p>Przepraszamy za utrudnienia i mamy nadzieję, że wkrótce uda nam się umówić wizytę dla <strong>${petName}</strong>.</p>

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
