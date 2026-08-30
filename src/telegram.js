function truncateCaption(text, limit = 1000) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= limit) return text;
  return text.substring(0, limit - 3) + '...';
}

export async function sendTelegramMessage(env, text) {
  if (!text) return { ok: false, description: 'Boş metin' };

  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
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
    return await response.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function sendTelegramPhoto(env, photoUrl, caption) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
  
  try {
    // 1. Önce fotoğraflı göndermeyi dene
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http')) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          photo: photoUrl,
          caption: truncateCaption(caption, 1000),
          parse_mode: 'HTML'
        })
      });

      const resData = await response.json();
      if (resData.ok) {
        return resData;
      }
      console.warn('Görsel gönderilemedi, metin olarak deneniyor:', resData.description);
    }

    // 2. Görsel geçersizse veya Telegram çekemezse doğrudan düz metin olarak gönder
    return await sendTelegramMessage(env, caption);
  } catch (err) {
    return await sendTelegramMessage(env, caption);
  }
}
