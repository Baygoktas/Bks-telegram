import { wikiFetchText } from "../lib/wikimedia";
import { translateToTurkish } from "../lib/translate";
import { makeContentHash, isAlreadyPosted, markAsPosted } from "../lib/dedupe";
import { sendTelegramMessage } from "../lib/telegram";

export interface DidYouKnowEnv {
  DB: D1Database;
  DEEPL_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
}

function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function formatDateForWikiPage(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Türkçe Wikipedia "Biliyor muydunuz?" arşiv sayfasından maddeleri çıkarır
function extractItemsFromWikitext(wikitext: string): string[] {
  const lines = wikitext.split("\n");
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("*") && !trimmed.startsWith("**")) {
      let cleaned = trimmed
        .replace(/^\*+\s*/, "")
        .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2")
        .replace(/'''/g, "")
        .replace(/''/g, "")
        .replace(/<ref[^>]*>.*?<\/ref>/g, "")
        .replace(/<ref[^>]*\/>/g, "")
        .trim();

      if (cleaned.length > 20 && cleaned.length < 500 && !cleaned.startsWith("{{")) {
        items.push(cleaned);
      }
    }
  }
  return items;
}

async function fetchDidYouKnowPage(dateStr: string): Promise<string[]> {
  const pageTitle = `Vikipedi:Biliyor_muydunuz?/${dateStr}`;
  const url = `https://tr.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
    pageTitle
  )}&prop=wikitext&format=json&origin=*`;

  const data: any = await wikiFetchText(url).then((t) => JSON.parse(t));
  if (data.error || !data.parse?.wikitext) return [];

  const wikitext: string = data.parse.wikitext["*"];
  return extractItemsFromWikitext(wikitext);
}

async function findUnpostedFact(
  db: D1Database,
  maxAttempts = 8
): Promise<{ text: string; sourceUrl: string } | null> {
  // Arşiv 2005'ten günümüze kadar var, geniş bir aralıktan rastgele tarih seçiyoruz
  const start = new Date("2006-01-01");
  const end = new Date();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomDate = randomDateBetween(start, end);
    const dateStr = formatDateForWikiPage(randomDate);

    let items: string[];
    try {
      items = await fetchDidYouKnowPage(dateStr);
    } catch (e) {
      console.log(`Biliyor muydunuz sayfası çekilemedi (${dateStr}): ${e}`);
      continue;
    }

    if (items.length === 0) continue;

    const shuffled = [...items].sort(() => Math.random() - 0.5);
    const sourceUrl = `https://tr.wikipedia.org/wiki/Vikipedi:Biliyor_muydunuz%3F/${dateStr}`;

    for (const text of shuffled) {
      const hash = await makeContentHash("did_you_know", text);
      const posted = await isAlreadyPosted(db, hash);
      if (!posted) {
        return { text, sourceUrl };
      }
    }
  }
  return null;
}

export async function postDidYouKnow(env: DidYouKnowEnv): Promise<void> {
  const result = await findUnpostedFact(env.DB);
  if (!result) {
    console.log("Biliyor muydunuz: uygun yeni içerik bulunamadı.");
    return;
  }

  const { text, sourceUrl } = result;
  const textTr = await translateToTurkish(text, env.DEEPL_API_KEY);

  const message = `💡 <b>Biliyor muydunuz?</b>\n\n${textTr}\n\n🔗 Kaynak: <a href="${sourceUrl}">Vikipedi</a>`;

  await sendTelegramMessage(env, message);

  const hash = await makeContentHash("did_you_know", text);
  await markAsPosted(env.DB, hash, "did_you_know", sourceUrl);
}
