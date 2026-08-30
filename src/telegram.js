function cleanCaption(text, limit = 1000) {
  if (text.length <= limit) return text;
  return text.substring(0, limit - 3) + '...';
}

export async function sendTelegramMessage(env, text) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    })
  });
  return response.json();
}

export async function sendTelegramPhoto(env, photoUrl, caption) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      photo: photoUrl,
      caption: cleanCaption(caption),
      parse_mode: 'HTML'
    })
  });
  
  const resData = await response.json();
  if (!resData.ok) {
    // Görsel yüklenemezse fallback metin gönder
    return await sendTelegramMessage(env, caption);
  }
  return resData;
}
