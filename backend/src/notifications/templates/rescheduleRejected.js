const { format } = require('date-fns');
const { pl } = require('date-fns/locale');

/**
 * Reschedule Rejected Email Template
 */

const generate = ({ userName, petName, oldScheduledAt, newScheduledAt, rejectionReason }) => {
  const oldDate = format(new Date(oldScheduledAt), "dd MMMM yyyy 'o' HH:mm", { locale: pl });
  const newDate = format(new Date(newScheduledAt), "dd MMMM yyyy 'o' HH:mm", { locale: pl });

  const subject = `❌ Zmiana terminu odrzucona - ${petName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .detail-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #fa709a; border-radius: 5px; }
    .warning-box { background: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; border-radius: 5px; }
    .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Zmiana Terminu Odrzucona</h1>
    </div>
    <div class="content">
      <p>Witaj <strong>${userName}</strong>,</p>

      <p>Niestety, nie możemy zaakceptować Twojej prośby o zmianę terminu wizyty.</p>

      <div class="detail-box">
        <h3>📋 Szczegóły propozycji:</h3>
        <p><strong>Pupil:</strong> ${petName}</p>
        <p><strong>Obecny termin:</strong> ${oldDate}</p>
        <p><strong>Proponowany termin:</strong> ${newDate}</p>
      </div>

      ${rejectionReason ? `
      <div class="warning-box">
        <h4>⚠️ Powód odrzucenia:</h4>
        <p>${rejectionReason}</p>
      </div>
      ` : ''}

      <p><strong>Twoja obecna wizyta pozostaje bez zmian:</strong></p>
      <ul>
        <li>Data: <strong>${oldDate}</strong></li>
        <li>Wizyta jest nadal aktywna i potwierdzona</li>
        <li>Możesz zaproponować inny termin lub skontaktować się z recepcją</li>
      </ul>

      <p>W razie pytań, prosimy o kontakt telefoniczny z naszą recepcją.</p>

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
