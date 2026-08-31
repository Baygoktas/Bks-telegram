import { wikiFetch } from "../lib/wikimedia";
import { translateToTurkish } from "../lib/translate";
import { makeContentHash, isAlreadyPosted, markAsPosted } from "../lib/dedupe";
import { sendTelegramMessage } from "../lib/telegram";

export interface OnThisDayEnv {
  DB: D1Database;
  DEEPL_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
}

interface OtdPage {
  title: string;
  content_urls?: { desktop?: { page?: string } };
}

interface OtdItem {
  text: string;
  year: number;
  pages?: OtdPage[];
}

interface OtdResponse {
  events: OtdItem[];
  births: OtdItem[];
  deaths: OtdItem[];
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getSourceUrl(item: OtdItem): string {
  return item.pages?.[0]?.content_urls?.desktop?.page || "https://en.wikipedia.org";
}

async function pickUnpostedItems(
  db: D1Database,
  items: OtdItem[],
  category: string,
  need: number
): Promise<OtdItem[]> {
  const candidates = pickRandom(items, items.length);
  const selected: OtdItem[] = [];

  for (const item of candidates) {
    if (selected.length >= need) break;
    const hash = await makeContentHash(category, `${item.year}-${item.text}`);
    const posted = await isAlreadyPosted(db, hash);
    if (!posted) {
      selected.push(item);
    }
  }
  return selected;
}

async function formatSection(
  db: D1Database,
  items: OtdItem[],
  category: string,
  emoji: string,
  label: string,
  deeplKey: string
): Promise<{ text: string; hashes: { hash: string; url: string }[] }> {
  let text = `${emoji} <b>${label}</b>\n`;
  const hashes: { hash: string; url: string }[] = [];

  for (const item of items) {
    const translated = await translateToTurkish(item.text, deeplKey);
    const url = getSourceUrl(item);
    text += `• ${item.year}: ${translated}\n`;
    const hash = await makeContentHash(category, `${item.year}-${item.text}`);
    hashes.push({ hash, url });
  }

  return { text, hashes };
}

export async function postOnThisDay(env: OnThisDayEnv): Promise<void> {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const data: OtdResponse = await wikiFetch(
    `https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/${mm}/${dd}`
  );

  const events = await pickUnpostedItems(env.DB, data.events, "onthisday_event", 5);
  const births = await pickUnpostedItems(env.DB, data.births, "onthisday_birth", 5);
  const deaths = await pickUnpostedItems(env.DB, data.deaths, "onthisday_death", 5);

  if (events.length === 0 && births.length === 0 && deaths.length === 0) {
    console.log("Tarihte bugün: gösterilecek yeni içerik bulunamadı.");
    return;
  }

  let message = `📅 <b>Tarihte Bugün — ${dd}.${mm}</b>\n\n`;
  const allHashes: { hash: string; url: string; category: string }[] = [];

  if (events.length > 0) {
    const { text, hashes } = await formatSection(
      env.DB, events, "onthisday_event", "🏛", "Olaylar", env.DEEPL_API_KEY
    );
    message += text + "\n";
    hashes.forEach((h) => allHashes.push({ ...h, category: "onthisday_event" }));
  }

  if (births.length > 0) {
    const { text, hashes } = await formatSection(
      env.DB, births, "onthisday_birth", "🎂", "Doğumlar", env.DEEPL_API_KEY
    );
    message += text + "\n";
    hashes.forEach((h) => allHashes.push({ ...h, category: "onthisday_birth" }));
  }

  if (deaths.length > 0) {
    const { text, hashes } = await formatSection(
      env.DB, deaths, "onthisday_death", "🕯", "Ölümler", env.DEEPL_API_KEY
    );
    message += text + "\n";
    hashes.forEach((h) => allHashes.push({ ...h, category: "onthisday_death" }));
  }

  message += `🔗 Kaynak: <a href="https://en.wikipedia.org/wiki/Wikipedia:Selected_anniversaries">Wikipedia</a>`;

  await sendTelegramMessage(env, message);

  for (const h of allHashes) {
    await markAsPosted(env.DB, h.hash, h.category, h.url);
  }
}
