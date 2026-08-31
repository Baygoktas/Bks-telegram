import { wikiFetch } from "../lib/wikimedia";
import { translateToTurkish } from "../lib/translate";
import { makeContentHash, isAlreadyPosted, markAsPosted } from "../lib/dedupe";
import { sendTelegramPhoto } from "../lib/telegram";

export interface WikiImageEnv {
  DB: D1Database;
  DEEPL_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
}

interface FeaturedResponse {
  image?: {
    title?: string;
    image?: { source?: string };
    description?: { text?: string };
    file_page?: string;
  };
}

function randomPastDate(): { yyyy: string; mm: string; dd: string } {
  const start = new Date("2013-01-01"); // Wikimedia featured feed bu tarihten itibaren mevcut
  const end = new Date();
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  const d = new Date(randomTime);
  return {
    yyyy: String(d.getFullYear()),
    mm: String(d.getMonth() + 1).padStart(2, "0"),
    dd: String(d.getDate()).padStart(2, "0"),
  };
}

export async function postWikiImage(env: WikiImageEnv): Promise<void> {
  let attempts = 0;
  const maxAttempts = 8;

  while (attempts < maxAttempts) {
    attempts++;
    const { yyyy, mm, dd } = randomPastDate();

    let data: FeaturedResponse;
    try {
      data = await wikiFetch(
        `https://en.wikipedia.org/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`
      );
    } catch (e) {
      console.log(`Featured feed hatası (${yyyy}-${mm}-${dd}): ${e}`);
      continue;
    }

    const image = data.image;
    if (!image?.image?.source) continue;

    const sourceUrl = image.file_page || `https://en.wikipedia.org/wiki/${yyyy}`;
    const hash = await makeContentHash("wiki_image", sourceUrl);
    const posted = await isAlreadyPosted(env.DB, hash);
    if (posted) continue;

    const title = image.title || "Günün Görseli";
    const description = image.description?.text || "";

    const titleTr = await translateToTurkish(title, env.DEEPL_API_KEY);
    const descriptionTr = description
      ? await translateToTurkish(description, env.DEEPL_API_KEY)
      : "";

    let caption = `🖼 <b>${titleTr}</b>\n\n${descriptionTr}\n\n🔗 Kaynak: <a href="${sourceUrl}">Wikimedia Commons</a>`;
    if (caption.length > 1024) {
      caption = `🖼 <b>${titleTr}</b>\n\n🔗 Kaynak: <a href="${sourceUrl}">Wikimedia Commons</a>`;
    }

    await sendTelegramPhoto(env, image.image.source, caption);
    await markAsPosted(env.DB, hash, "wiki_image", sourceUrl);
    return;
  }

  console.log("Wikipedia günün görseli: uygun yeni içerik bulunamadı.");
}
