// Serverless function to send form submissions to Telegram
module.exports = async (req, res) => {
  // Set CORS headers for security and browser accessibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается.' });
  }

  const { name, phone, car, service, comment, source } = req.body;

  // Validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Пожалуйста, заполните обязательное поле: Имя' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Пожалуйста, заполните обязательное поле: Телефон' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('Environment variables TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID are not set.');
    return res.status(500).json({ error: 'Ошибка конфигурации сервера. Проверьте переменные окружения.' });
  }

  // Format Chat ID: Group/supergroup IDs must start with '-'
  // If it starts with '100' (positive representation of a supergroup ID), we prepend '-'
  let formattedChatId = chatId.trim();
  if (!formattedChatId.startsWith('-')) {
    if (formattedChatId.startsWith('100')) {
      formattedChatId = `-${formattedChatId}`;
    }
  }

  // Map internal service values to human-readable Russian text
  const serviceMap = {
    'wash': 'Детейлинг-мойка',
    'polish': 'Полировка кузова',
    'ceramic': 'Керамическое покрытие',
    'wrap': 'Защитная пленка (PPF)',
    'dry-clean': 'Химчистка салона',
    'leather': 'Уход за кожей',
    'prep': 'Антидождь & Подготовка',
    'complex': 'Комплексный уход',
    'none': 'Не выбрана'
  };

  const readableService = serviceMap[service] || service || 'Не указана';

  // Format current date and time in Moscow (MSK) timezone
  const now = new Date();
  const dateOptions = {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  const dateTimeStr = now.toLocaleString('ru-RU', dateOptions) + ' (МСК)';

  // Clean phone number for active links
  const cleanPhone = phone.replace(/\D/g, '');
  let waPhone = cleanPhone;
  if (waPhone.startsWith('8') && waPhone.length === 11) {
    waPhone = '7' + waPhone.substring(1);
  }
  const waLink = waPhone ? `https://wa.me/${waPhone}` : '';

  // Format HTML message for Telegram
  let message = `<b>🔔 Новая заявка с сайта 611 detailing</b>\n\n`;
  message += `👤 <b>Имя клиента:</b> ${escapeHtml(name.trim())}\n`;
  message += `📞 <b>Телефон:</b> <a href="tel:${cleanPhone}">${escapeHtml(phone.trim())}</a>\n`;

  if (car && car.trim()) {
    message += `🚗 <b>Автомобиль:</b> ${escapeHtml(car.trim())}\n`;
  }

  message += `🛠 <b>Выбранная услуга:</b> ${escapeHtml(readableService)}\n`;

  if (comment && comment.trim()) {
    message += `💬 <b>Комментарий:</b> <i>${escapeHtml(comment.trim())}</i>\n`;
  }

  message += `\n📄 <b>Страница отправки:</b> ${escapeHtml(source || 'Не указана')}\n`;
  message += `⏰ <b>Дата и время:</b> ${dateTimeStr}\n`;

  if (waLink) {
    message += `\n🟢 <a href="${waLink}">Написать в WhatsApp</a>`;
  }

  try {
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: formattedChatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      console.error('Telegram API response error:', result);
      return res.status(502).json({ error: 'Не удалось отправить сообщение в Telegram через API.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Network error during Telegram API call:', err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при отправке.' });
  }
};

// Helper function to escape HTML tags and prevent Telegram parse errors
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
