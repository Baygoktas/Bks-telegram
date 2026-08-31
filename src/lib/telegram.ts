export interface TelegramEnv {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
}

export async function sendTelegramMessage(
  env: TelegramEnv,
  text: string
): Promise<void> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHANNEL_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${errBody}`);
  }
}

export async function sendTelegramPhoto(
  env: TelegramEnv,
  photoUrl: string,
  caption: string
): Promise<void> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHANNEL_ID,
      photo: photoUrl,
      caption,
      parse_mode: "HTML",
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Telegram sendPhoto failed: ${res.status} ${errBody}`);
  }
}

// Video başarıyla gönderilirse true, gönderilemezse (boyut/format sorunu) false döner.
export async function sendTelegramVideo(
  env: TelegramEnv,
  videoUrl: string,
  caption: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendVideo`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHANNEL_ID,
      video: videoUrl,
      caption,
      parse_mode: "HTML",
      supports_streaming: true,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.log(`Telegram sendVideo başarısız (${res.status}): ${errBody}`);
    return false;
  }
  return true;
}
