import { XMLParser } from 'fast-xml-parser';
import { isAlreadyPublished, recordPublished } from '../db.js';
import { sendTelegramPhoto } from '../telegram.js';
import { translateToTurkish } from '../translate.js';

export async function handlePOTD(env) {
  const feedUrl = 'https://commons.wikimedia.org/w/api.php?action=featuredfeed&feed=potd&feedformat=rss';
  const response = await fetch(feedUrl, { headers: { 'User-Agent': 'TelegramBot/1.0' } });
  if (!response.ok) return;

  const xmlText = await response.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const jsonObj = parser.parse(xmlText);

  const items = jsonObj.rss?.channel?.item;
  if (!items) return;

  const latestItem = Array.isArray(items) ? items[items.length - 1] : items;
  const descriptionHtml = latestItem.description || '';

  // HTML içinden img src ve metni ayıklama
  const imgMatch = descriptionHtml.match(/src=["']([^"']+)["']/i);
  const textMatch = descriptionHtml.replace(/<[^>]*>/g, '').trim();

  if (!imgMatch) return;

  let imgUrl = imgMatch[1];
  if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
  
  // Yüksek çözünürlük için thumbnail yerine orijinal linki çekme
  imgUrl = imgUrl.replace(/\/thumb(\/.*)\/[^\/]+$/, '$1');

  const isUsed = await isAlreadyPublished(env.DB, textMatch, latestItem.guid || imgUrl);

  if (!isUsed) {
    const trDescription = await translateToTurkish(textMatch);
    const caption = `📸 <b>GÜNÜN SEÇKİN GÖRSELİ</b>\n\n${trDescription}\n\n🌐 <i>Kaynak: Wikimedia Commons</i>`;

    await sendTelegramPhoto(env, imgUrl, caption);
    await recordPublished(env.DB, 'potd', textMatch, latestItem.guid || imgUrl);
  }
}
