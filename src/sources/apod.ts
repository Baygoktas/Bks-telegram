import { translateToTurkish } from "../lib/translate";
import { makeContentHash, isAlreadyPosted, markAsPosted } from "../lib/dedupe";
import { sendTelegramPhoto, sendTelegramVideo } from "../lib/telegram";

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
  thumbnail_url?: string;
}

function isDirectVideoFile(url: string): boolean {
  return /\.(mp4|mov|webm)(\?.*)?$/i.test(url);
}

export async function postApod(env: ApodEnv): Promise<void> {
  const res = await fetch(
    `https://api.nasa.gov/planetary/apod?api_key=${env.NASA_API_KEY}&thumbs=true`,
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

  const caption = fullCaption.length > 1024 ? shortCaption : fullCaption;

  if (data.media_type === "image") {
    const imageUrl = data.hdurl || data.url;
    await sendTelegramPhoto(env, imageUrl, caption);
  } else if (data.media_type === "video" && isDirectVideoFile(data.url)) {
    // Doğrudan mp4/mov/webm dosyası ise video olarak göndermeyi dene (20MB sınırı içindeyse)
    const sent = await sendTelegramVideo(env, data.url, caption);
    if (!sent) {
      // Video 20MB'ı aştı veya gönderilemedi -> thumbnail görsele düş
      await postWithThumbnailFallback(env, data, caption);
    }
  } else {
    // YouTube gibi gömülü video, doğrudan dosya değil -> thumbnail görsele düş
    await postWithThumbnailFallback(env, data, caption);
  }

  await markAsPosted(env.DB, contentHash, "apod", data.url);
}

async function postWithThumbnailFallback(
  env: ApodEnv,
  data: ApodResponse,
  caption: string
): Promise<void> {
  if (data.thumbnail_url) {
    await sendTelegramPhoto(env, data.thumbnail_url, caption);
  } else {
    // Hiç thumbnail de yoksa (nadir), en azından bir NASA logosu/placeholder kullanabiliriz
    // ama pratikte thumbs=true neredeyse her zaman bir görsel döndürür.
    console.log("APOD: video için thumbnail bulunamadı, atlanıyor.");
  }
}
