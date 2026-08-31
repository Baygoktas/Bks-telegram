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

// Videoyu Worker önce indirir, sonra dosya olarak Telegram'a yükler (URL ile değil).
// Bu, NASA sunucusunun Telegram'ın kendi erişimini engellediği durumları aşar.
export async function sendTelegramVideoFile(
  env: TelegramEnv,
  videoData: ArrayBuffer,
  filename: string,
  caption: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendVideo`;

  const formData = new FormData();
  formData.append("chat_id", env.TELEGRAM_CHANNEL_ID);
  formData.append("caption", caption);
  formData.append("parse_mode", "HTML");
  formData.append("supports_streaming", "true");
  formData.append("video", new Blob([videoData]), filename);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.log(`Telegram sendVideo (dosya) başarısız (${res.status}): ${errBody}`);
    return false;
  }
  return true;
}
