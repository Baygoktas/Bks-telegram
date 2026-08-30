import { XMLParser } from 'fast-xml-parser';
import { isAlreadyPublished, recordPublished } from '../db.js';
import { sendTelegramPhoto, sendTelegramMessage } from '../telegram.js';

export async function handleScienceRSS(env) {
  const rssUrl = 'https://bilimgenc.tubitak.gov.tr/rss.xml';
  const response = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (TelegramBot/1.0)' } });
  if (!response.ok) return;

  const xmlData = await response.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const jsonObj = parser.parse(xmlData);

  const items = jsonObj.rss?.channel?.item;
  if (!items) return;

  const itemList = Array.isArray(items) ? items : [items];

  for (const item of itemList) {
    const title = item.title || '';
    const description = (item.description || '').replace(/<[^>]*>/g, '').trim();
    const link = item.link || '';
    const guid = item.guid?.['#text'] || item.guid || link;

    const isUsed = await isAlreadyPublished(env.DB, description, guid);
    if (!isUsed) {
      let imageUrl = null;
      if (item.enclosure && item.enclosure['@_url']) {
        imageUrl = item.enclosure['@_url'];
      }

      const caption = `🔬 <b>TÜBİTAK BİLİM GENÇ | POPÜLER BİLİM</b>\n\n<b>${title}</b>\n\n${description}\n\n🔗 <a href="${link}">Haberi Oku</a>\n📡 <i>Kaynak: TÜBİTAK Bilim Genç</i>`;

      if (imageUrl) {
        await sendTelegramPhoto(env, imageUrl, caption);
      } else {
        await sendTelegramMessage(env, caption);
      }

      await recordPublished(env.DB, 'tubitak_rss', description, guid);
      break;
    }
  }
}
