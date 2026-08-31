import { translateToTurkish } from "../lib/translate";
import { makeContentHash, isAlreadyPosted, markAsPosted } from "../lib/dedupe";
import { sendTelegramPhoto, sendTelegramMessage } from "../lib/telegram";

export interface ApodEnv {
  DB: D1Database;
  NASA_API_KEY: string;
  DEEPL_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
}

interface ApodResponse {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: string;
  date: string;
}

export async function postApod(env: ApodEnv): Promise<void> {
  const res = await fetch(
    `https://api.nasa.gov/planetary/apod?api_key=${env.NASA_API_KEY}`
  );
  if (!res.ok) {
    throw new Error(`NASA APOD fetch failed: ${res.status}`);
  }
  const data: ApodResponse = await res.json();

  const contentHash = await makeContentHash("apod", data.date);
  const alreadyPosted = await isAlreadyPosted(env.DB, contentHash);
  if (alreadyPosted) {
    console.log(`APOD ${data.date} zaten paylaşılmış, atlanıyor.`);
    return;
  }

  const titleTr = await translateToTurkish(data.title, env.DEEPL_API_KEY);
  const explanationTr = await translateToTurkish(data.explanation, env.DEEPL_API_KEY);

  const caption = `🔭 <b>${titleTr}</b>\n\n${explanationTr}\n\n🔗 Kaynak: <a href="https://apod.nasa.gov/apod/astropix.html">NASA APOD</a>`;

  if (data.media_type === "image") {
    const imageUrl = data.hdurl || data.url;
    // Telegram fotoğraf caption sınırı 1024 karakter
    if (caption.length > 1024) {
      const shortCaption = `🔭 <b>${titleTr}</b>\n\n🔗 Kaynak: <a href="https://apod.nasa.gov/apod/astropix.html">NASA APOD</a>`;
      await sendTelegramPhoto(env, imageUrl, shortCaption);
    } else {
      await sendTelegramPhoto(env, imageUrl, caption);
    }
  } else {
    // media_type "video" ise (bazen NASA video paylaşır), sadece metin gönderelim
    await sendTelegramMessage(env, caption);
  }

  await markAsPosted(env.DB, contentHash, "apod", data.url);
}
