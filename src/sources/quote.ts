import { wikiFetchText } from "../lib/wikimedia";
import { translateToTurkish } from "../lib/translate";
import { makeContentHash, isAlreadyPosted, markAsPosted } from "../lib/dedupe";
import { sendTelegramMessage } from "../lib/telegram";

export interface QuoteEnv {
  DB: D1Database;
  DEEPL_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
}

// Sabit isim listesi yerine geniş Wikiquote kategorileri kullanıyoruz.
// Her kategori genelde 100-500 arası yazar/filozof içerir, havuz pratikte çok geniş.
const BOOK_CATEGORIES = [
  "Category:Novelists",
  "Category:American novelists",
  "Category:British novelists",
  "Category:Russian writers",
  "Category:French writers",
  "Category:Poets",
  "Category:Playwrights",
];

const PHILOSOPHY_CATEGORIES = [
  "Category:Philosophers",
  "Category:Ancient Greek philosophers",
  "Category:German philosophers",
  "Category:French philosophers",
  "Category:Stoic philosophers",
  "Category:Political philosophers",
  "Category:Ethicists",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchCategoryMembers(category: string): Promise<string[]> {
  const url = `https://en.wikiquote.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(
    category
  )}&cmlimit=500&cmnamespace=0&format=json&origin=*`;

  const data: any = await wikiFetchText(url).then((t) => JSON.parse(t));
  const members = data.query?.categorymembers ?? [];
  return members.map((m: any) => m.title as string);
}

function extractQuotesFromWikitext(wikitext: string): string[] {
  const lines = wikitext.split("\n");
  const quotes: string[] = [];

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

      if (cleaned.length > 15 && cleaned.length < 400 && !cleaned.startsWith("{{")) {
        quotes.push(cleaned);
      }
    }
  }

  return quotes;
}

async function fetchQuotesForAuthor(author: string): Promise<string[]> {
  const url = `https://en.wikiquote.org/w/api.php?action=parse&page=${encodeURIComponent(
    author
  )}&prop=wikitext&format=json&origin=*`;

  const data: any = await wikiFetchText(url).then((t) => JSON.parse(t));
  if (data.error || !data.parse?.wikitext) return [];

  const wikitext: string = data.parse.wikitext["*"];
  return extractQuotesFromWikitext(wikitext);
}

async function findUnpostedQuote(
  db: D1Database,
  categories: string[],
  category: string,
  maxAttempts = 6
): Promise<{ author: string; quote: string } | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const wikiCategory = pickRandom(categories);
    let members: string[];
    try {
      members = await fetchCategoryMembers(wikiCategory);
    } catch (e) {
      console.log(`Kategori üyeleri çekilemedi (${wikiCategory}): ${e}`);
      continue;
    }
    if (members.length === 0) continue;

    const author = pickRandom(members);
    let quotes: string[];
    try {
      quotes = await fetchQuotesForAuthor(author);
    } catch (e) {
      console.log(`Wikiquote fetch hatası (${author}): ${e}`);
      continue;
    }
    if (quotes.length === 0) continue;

    const shuffled = [...quotes].sort(() => Math.random() - 0.5);
    for (const quote of shuffled) {
      const hash = await makeContentHash(category, `${author}|${quote}`);
      const posted = await isAlreadyPosted(db, hash);
      if (!posted) {
        return { author, quote };
      }
    }
  }
  return null;
}

export async function postQuote(
  env: QuoteEnv,
  type: "book" | "philosophy"
): Promise<void> {
  const categories = type === "book" ? BOOK_CATEGORIES : PHILOSOPHY_CATEGORIES;
  const category = type === "book" ? "book_quote" : "philosophy_quote";
  const emoji = type === "book" ? "📖" : "🦉";
  const label = type === "book" ? "Kitap Alıntısı" : "Felsefi Söz";

  const result = await findUnpostedQuote(env.DB, categories, category);
  if (!result) {
    console.log(`${label}: uygun yeni alıntı bulunamadı.`);
    return;
  }

  const { author, quote } = result;
  const quoteTr = await translateToTurkish(quote, env.DEEPL_API_KEY);

  const sourceUrl = `https://en.wikiquote.org/wiki/${encodeURIComponent(author)}`;
  const message = `${emoji} <b>${label}</b>\n\n"${quoteTr}"\n\n— ${
