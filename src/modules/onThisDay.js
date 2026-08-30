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

  const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/${month}/${day}`;
  const response = await fetch(url, { 
    headers: { 
      'User-Agent': 'BilimKulturTelegramBot/1.0 (https://t.me/; contact@example.com)' 
    } 
  });
  
  if (!response.ok) {
    console.error(`OnThisDay API Hatası: ${response.status} ${response.statusText}`);
    return `Wikipedia API Hatası: ${response.status}`;
  }

  const data = await response.json();
  const results = [];

  const processCategory = async (items, titleTr, catKey) => {
    if (!items || items.length === 0) return;

    const selectedItems = pickDiverseItems(items, 6);
    let messageBody = `🗓 <b>TARİHTE BUGÜN | ${titleTr.toUpperCase()}</b>\n\n`;
    let mainThumbnail = null;

    for (const item of selectedItems) {
      const year = item.year || 'Bilinmiyor';
      const rawText = item.text || '';
      
      if (!mainThumbnail && item.pages && item.pages[0]?.thumbnail?.source) {
        mainThumbnail = item.pages[0].thumbnail.source;
      }

      let pageUrl = `https://en.wikipedia.org/wiki/${month}_${day}`;
      if (item.pages && item.pages[0]?.content_urls?.desktop?.page) {
        pageUrl = item.pages[0].content_urls.desktop.page;
      }

      let trText = await translateToTurkish(rawText);
      trText = trText.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      messageBody += `▫️ <b>${year}:</b> ${trText} <a href="${pageUrl}">[Detay]</a>\n\n`;
    }

    messageBody += `🔍 <a href="https://en.wikipedia.org/wiki/${month}_${day}">Kaynak: Dünya Tarihi Arşivi</a>`;

    // Mesajı Telegram'a gönder
    let tgRes;
    if (mainThumbnail) {
      tgRes = await sendTelegramPhoto(env, mainThumbnail, messageBody);
    } else {
      tgRes = await sendTelegramMessage(env, messageBody);
    }

    results.push({ category: catKey, response: tgRes });
    await recordPublished(env.DB, `tarihte_bugun_${catKey}`, messageBody);
  };

  await processCategory(data.events, 'Önemli Olaylar', 'events');
  await new Promise(r => setTimeout(r, 2000));
  await processCategory(data.births, 'Doğanlar', 'births');
  await new Promise(r => setTimeout(r, 2000));
  await processCategory(data.deaths, 'Ölenler', 'deaths');

  return results;
}
