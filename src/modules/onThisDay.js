import { isAlreadyPublished, recordPublished } from '../db.js';
import { sendTelegramMessage, sendTelegramPhoto } from '../telegram.js';
import { translateToTurkish } from '../translate.js';

function pickDiverseItems(items, count = 6) {
  if (!items || items.length === 0) return [];
  if (items.length <= count) return items;

  const sorted = [...items].sort((a, b) => (a.year || 0) - (b.year || 0));
  const chunkSize = Math.floor(sorted.length / count);
  const selected = [];

  for (let i = 0; i < count; i++) {
    const start = i * chunkSize;
    const end = (i === count - 1) ? sorted.length : (i + 1) * chunkSize;
    const pool = sorted.slice(start, end);
    if (pool.length > 0) {
      selected.push(pool[Math.floor(Math.random() * pool.length)]);
    }
  }

  return selected.sort((a, b) => (a.year || 0) - (b.year || 0));
}

export async function handleOnThisDay(env) {
  const now = new Date();
  const trDate = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  const month = String(trDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(trDate.getUTCDate()).padStart(2, '0');

  // Küresel ve zengin içerik için İngilizce API'den çekip çeviriyoruz
  const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/${month}/${day}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'TelegramBot/1.0' } });
  
  if (!response.ok) return;
  const data = await response.json();

  const processCategory = async (items, titleTr, catKey) => {
    if (!items || items.length === 0) return;

    const selectedItems = pickDiverseItems(items, 6);
    let messageBody = `🗓 <b>TARİHTE BUGÜN | ${titleTr.toUpperCase()}</b>\n\n`;
    let mainThumbnail = null;
    let combinedKeys = '';

    for (const item of selectedItems) {
      const year = item.year || 'Bilinmiyor';
      const rawText = item.text || '';
      
      // İlk görseli yakala
      if (!mainThumbnail && item.pages && item.pages[0]?.thumbnail?.source) {
        mainThumbnail = item.pages[0].thumbnail.source;
      }

      // Detay linki
      let pageUrl = `https://tr.wikipedia.org/wiki/${month}_${day}`;
      if (item.pages && item.pages[0]?.content_urls?.desktop?.page) {
        pageUrl = item.pages[0].content_urls.desktop.page;
      }

      // Metni Türkçeye çevir
      const trText = await translateToTurkish(rawText);

      messageBody += `▫️ <b>${year}:</b> ${trText} <a href="${pageUrl}">[Detay]</a>\n\n`;
      combinedKeys += `${year}_${rawText.substring(0, 10)}_`;
    }

    messageBody += `🔍 <a href="https://en.wikipedia.org/wiki/${month}_${day}">Kaynak: Dünya Tarihi Arşivi</a>`;

    const isUsed = await isAlreadyPublished(env.DB, messageBody, `otd_${catKey}_${day}_${month}_${combinedKeys.substring(0, 25)}`);
    
    if (!isUsed) {
      if (mainThumbnail) {
        await sendTelegramPhoto(env, mainThumbnail, messageBody);
      } else {
        await sendTelegramMessage(env, messageBody);
      }
      await recordPublished(env.DB, `tarihte_bugun_${catKey}`, messageBody, `otd_${catKey}_${day}_${month}`);
    }
  };

  await processCategory(data.events, 'Önemli Olaylar', 'events');
  await new Promise(r => setTimeout(r, 2500));
  await processCategory(data.births, 'Doğanlar', 'births');
  await new Promise(r => setTimeout(r, 2500));
  await processCategory(data.deaths, 'Ölenler', 'deaths');
}
