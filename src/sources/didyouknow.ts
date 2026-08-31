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

const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function formatDateForTrWikiPage(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function extractBulletItems(wikitext: string, minLen = 20, maxLen = 500): string[] {
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

      if (cleaned.length > minLen && cleaned.length < maxLen && !cleaned.startsWith("{{")) {
        items.push(cleaned);
      }
    }
  }
  return items;
}

// --- Türkçe kaynak: Vikipedi:Biliyor muydunuz?/YYYY-AA-GG (günlük arşiv) ---
async function fetchTrDidYouKnow(): Promise<{ text: string; sourceUrl: string } | null> {
  const start = new Date("2006-01-01");
  const end = new Date();
  const randomDate = randomDateBetween(start, end);
  const dateStr = formatDateForTrWikiPage(randomDate);

  const pageTitle = `Vikipedi:Biliyor_muydunuz?/${dateStr}`;
  const url = `https://tr.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
    pageTitle
  )}&prop=wikitext&format=json&origin=*`;

  const data: any = await wikiFetchText(url).then((t) => JSON.parse(t));
  if (data.error || !data.parse?.wikitext) return null;

  const items = extractBulletItems(data.parse.wikitext["*"]);
  if (items.length === 0) return null;

  const sourceUrl = `https://tr.wikipedia.org/wiki/Vikipedi:Biliyor_muydunuz%3F/${dateStr}`;
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return { text: shuffled[0], sourceUrl };
}

// --- İngilizce kaynak: Wikipedia:Recent additions/YYYY/Ay (aylık arşiv) ---
async function fetchEnDidYouKnow(): Promise<{ text: string; sourceUrl: string } | null> {
  const startYear = 2010;
  const endYear = new Date().getFullYear();
  const year = startYear + Math.floor(Math.random() * (endYear - startYear + 1));
  const month = EN_MONTHS[Math.floor(Math.random() * EN_MONTHS.length)];

  const pageTitle = `Wikipedia:Recent additions/${year}/${month}`;
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
    pageTitle
  )}&prop=wikitext&format=json&origin=*`;

  const data: any = await wikiFetchText(url).then((t) => JSON.parse(t));
  i
