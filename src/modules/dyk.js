import { isAlreadyPublished, recordPublished } from '../db.js';
import { sendTelegramMessage } from '../telegram.js';
import { translateToTurkish } from '../translate.js';

export async function handleDYK(env) {
  const now = new Date();
  const trDate = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  const year = trDate.getUTCFullYear();
  const month = String(trDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(trDate.getUTCDate()).padStart(2, '0');

  // İngilizce zengin DYK feed'inden çekip Türkçeleştirme
  const url = `https://en.wikipedia.org/api/rest_v1/feed/featured/${year}/${month}/${day}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'TelegramBot/1.0' } });

  if (!response.ok) return;
  const data = await response.json();
  const dykList = data.dyk || [];

  for (const item of dykList) {
    const rawText = item.text.replace(/<[^>]*>/g, '');
    const isUsed = await isAlreadyPublished(env.DB, rawText);

    if (!isUsed) {
      let trText = await translateToTurkish(rawText);
      trText = trText.replace(/^\.\.\.\s*that\s*/i, '').replace(/^\.\.\.\s*/i, '');

      const message = `💡 <b>BUNU BİLİYOR MUYDUNUZ?</b>\n\n👀 ${trText}\n\n🔍 <i>Kaynak: Bilim & Kültür Ansiklopedisi</i>`;
      await sendTelegramMessage(env, message);
      await recordPublished(env.DB, 'bbm', rawText);
      break;
    }
  }
}
