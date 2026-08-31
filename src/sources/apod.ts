import { translateToTurkish } from "../lib/translate";
import { makeContentHash, isAlreadyPosted, markAsPosted } from "../lib/dedupe";
import { sendTelegramPhoto, sendTelegramMessage, sendTelegramVideo } from "../lib/telegram";

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
  copyright?: string;
}

function isDirectVideoFile(url: string): boolean {
  return /\.(mp4|mov|webm)(\?.*)?$/i.test(url);
}

export async function postApod(env: ApodEnv): Promise<void> {
  const res = await fetch(
    `https://api.nasa.gov/planetary/apod?api_key=${env.NASA_API_KEY}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BKS-TelegramBot/1.0)",
        "Accept": "application/json",
      },
    }
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
  const creditLine = data.copyright ? `\n© ${data.copyright.trim()}\n` : "\n";

  const fullCaption =
    `🔭 <b>GÜNÜN UZAY FOTOĞRAFI</b>\n\n` +
    `<b>${titleTr}</b>\n\n` +
    `${explanationTr}\n` +
    `${creditLine}\n` +
    `🔗 Kaynak: <a href="https://apod.nasa.gov/apod/astropix.html">NASA APOD</a>`;

  const shortCaption =
    `🔭 <b>GÜNÜN UZAY FOTOĞRAFI</b>\n\n` +
    `<b>${titleTr}</b>\n` +
    `${creditLine}\n` +
    `🔗 Kaynak: <a href="https://apod.nasa.gov/apod/astropix.html">NASA APOD</a>`;

  if (data.media_type === "image") {
    const imageUrl = data.hdurl || data.url;
    if (fullCaption.length > 1024) {
      await sendTelegramPhoto(env, imageUrl, shortCaption);
    } else {
      await sendTelegramPhoto(env, imageUrl, fullCaption);
    }
  } else if (data.media_type === "video" && isDirectVideoFile(data.url)) {
    // Doğrudan mp4/mov/webm dosyası ise video olarak göndermeyi dene
    const caption = fullCaption.length > 1024 ? shortCaption : fullCaption;
    const sent = await sendTelegramVideo(env, data.url, caption);
    if (!sent) {
      // Video çok büyük veya Telegram indiremedi, metne düş
      await sendTelegramMessage(env, fullCaption.length > 4096 ? shortCaption : fullCaption);
    }
  } else {
    // YouTube gibi gömülü video ise (doğrudan dosya değil), metin + link olarak gönder
    const messageWithLink = `${fullCaption}\n\n🎬 Video: ${data.url}`;
    await sendTelegramMessage(
      env,
      messageWithLink.length > 4096 ? shortCaption : messageWithLink
    );
  }

  await markAsPosted(env.DB, contentHash, "apod", data.url);
}
