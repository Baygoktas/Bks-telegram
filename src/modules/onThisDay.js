import { isAlreadyPublished, recordPublished } from '../db.js';
import { sendTelegramMessage, sendTelegramPhoto } from '../telegram.js';

export async function handleOnThisDay(env) {
  const now = new Date();
  const trDate = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  const month = String(trDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(trDate.getUTCDate()).padStart(2, '0');

  const url = `https://tr.wikipedia.org/api/rest_v1/feed/onthisday/all/${month}/${day}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'TelegramBot/1.0' } });
  
  if (!response.ok) return;
  const data = await response.json();

  const processCategory = async (items, title, catKey) => {
    if (!items || items.length === 0) return;
    
    // Rastgele veya ilk sıradaki paylaşılmamış öğeyi bul
    for (const item of items.slice(0, 15)) {
      const text = item.text;
      const isUsed = await isAlreadyPublished(env.DB, text, `onthisday_${catKey}_${item.year}_${day}_${month}`);
      
      if (!isUsed) {
        const message = `🗓 <b>TARİHTE BUGÜN | ${title.toUpperCase()}</b>\n\n<b>Yıl:</b> ${item.year}\n\n${text}\n\n🔍 <i>Kaynak: Vikipedi</i>`;
        const thumbnail = item.pages && item.pages[0]?.thumbnail?.source;

        if (thumbnail) {
          await sendTelegramPhoto(env, thumbnail, message);
        } else {
          await sendTelegramMessage(env, message);
        }

        await recordPublished(env.DB, `tarihte_bugun_${catKey}`, text, `onthisday_${catKey}_${item.year}_${day}_${month}`);
        break;
      }
    }
  };

  // 3 ayrı mesaj gönderimi
  await processCategory(data.events, 'Önemli Olaylar', 'events');
  await new Promise(r => setTimeout(r, 2000));
  await processCategory(data.births, 'Doğanlar', 'births');
  await new Promise(r => setTimeout(r, 2000));
  await processCategory(data.deaths, 'Ölenler', 'deaths');
}
