const { format } = require('date-fns');
const { pl } = require('date-fns/locale');

/**
 * Vaccination Reminder Email Template
 */

const generate = ({ userName, petName, vaccineName, dueDate, daysUntil }) => {
  const formattedDate = format(new Date(dueDate), "dd MMMM yyyy", { locale: pl });

  const subject = `💉 Przypomnienie o szczepieniu - ${petName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .detail-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #00bcd4; border-radius: 5px; }
    .highlight-box { background: #e0f7fa; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
    .days-count { font-size: 48px; font-weight: bold; color: #00bcd4; }
    .button { display: inline-block; padding: 12px 30px; background: #00bcd4; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💉 Przypomnienie o Szczepieniu</h1>
    </div>
    <div class="content">
      <p>Witaj <strong>${userName}</strong>,</p>

      <p>Przypominamy o zbliżającym się terminie szczepienia dla <strong>${petName}</strong>!</p>

      <div class="highlight-box">
        <p style="font-size: 18px; margin: 0;">Za:</p>
        <div class="days-count">${daysUntil} ${daysUntil === 1 ? 'dzień' : 'dni'}</div>
      </div>

      <div class="detail-box">
        <h3>💉 Szczegóły szczepienia:</h3>
        <p><strong>Pupil:</strong> ${petName}</p>
        <p><strong>Szczepienie:</strong> ${vaccineName}</p>
        <p><strong>Termin:</strong> ${formattedDate}</p>
      </div>

      <p><strong>Dlaczego to ważne?</strong></p>
      <ul>
        <li>Regularne szczepienia chronią Twojego pupila przed niebezpiecznymi chorobami</li>
        <li>Terminowe szczepienia są wymagane prawnie</li>
        <li>Ochrona Twojego zwierzaka i innych zwierząt w okolicy</li>
      </ul>

      <p><strong>Co dalej?</strong></p>
      <ul>
        <li>Zaloguj się do panelu klienta i umów wizytę na szczepienie</li>
        <li>Lub zadzwoń do recepcji: +48 123 456 789</li>
        <li>Przygotuj książeczkę zdrowia ${petName}</li>
      </ul>

      <p>Dbamy o zdrowie Twojego pupila! 🐾</p>

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
