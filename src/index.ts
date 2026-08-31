import { HOUR_UTC_TO_CONTENT_TYPE } from "./config";
import { postOnThisDay } from "./sources/onthisday";
import { postDidYouKnow } from "./sources/didyouknow";
import { postApod } from "./sources/apod";
import { postQuote } from "./sources/quote";
import { postWikiImage } from "./sources/wikiImage";
import { postArt } from "./sources/art";

export interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
  NASA_API_KEY: string;
  DEEPL_API_KEY: string;
}

async function runContentJob(contentType: string, env: Env): Promise<void> {
  console.log(`Çalıştırılıyor: ${contentType}`);

  switch (contentType) {
    case "onthisday":
      await postOnThisDay(env);
      break;
    case "did_you_know":
      await postDidYouKnow(env);
      break;
    case "apod":
      await postApod(env);
      break;
    case "book_quote":
      await postQuote(env, "book");
      break;
    case "philosophy_quote":
      await postQuote(env, "philosophy");
      break;
    case "wiki_image":
      await postWikiImage(env);
      break;
    case "art":
      await postArt(env);
      break;
    default:
      console.log(`Bilinmeyen içerik tipi: ${contentType}`);
  }
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = new Date(event.scheduledTime);
    const utcHour = now.getUTCHours();

    const contentType = HOUR_UTC_TO_CONTENT_TYPE[utcHour];

    if (!contentType) {
      console.log(`UTC saat ${utcHour} için tanımlı içerik yok, atlanıyor.`);
      return;
    }

    try {
      await runContentJob(contentType, env);
    } catch (e) {
      console.error(`Hata (${contentType}):`, e);
    }
  },

  // Manuel test için: tarayıcıdan Worker URL'ine ?type=apod gibi bir parametre ile istek atınca çalışır
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const testType = url.searchParams.get("type");

    if (testType) {
      try {
        await runContentJob(testType, env);
        return new Response(`OK: ${testType} çalıştırıldı.`, { status: 200 });
      } catch (e: any) {
        return new Response(`Hata: ${e.message}`, { status: 500 });
      }
    }

    return new Response("BKS Telegram Bot çalışıyor. Test için ?type=apod gibi bir parametre ekleyin.", {
      status: 200,
    });
  },
};
