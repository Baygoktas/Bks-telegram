import { isAlreadyPublished, recordPublished } from '../db.js';
import { sendTelegramMessage } from '../telegram.js';
import { translateToTurkish } from '../translate.js';

export async function handleDYK(env) {
  try {
    // Rastgele tarih seçimi
    const randomMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const randomDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const randomYear = Math.floor(Math.random() * (2025 - 2020 + 1)) + 2020;

    const url = `https://en.wikipedia.org/api/rest_v1/feed/featured/${randomYear}/${randomMonth}/${randomDay}`;
    const response = await fetch(url, { 
      headers: { 
        'User-Agent': 'BilimKulturTelegramBot/1.0 (https://t.me/; contact@example.com)' 
      } 
    });

    if (!response.ok) {
      console.error(`Wikipedia DYK API Hatası: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    const dykList = data.dyk || [];

    if (dykList.length === 0) {
      console.log('DYK listesi boş döndü.');
      return;
    }

    // Rastgele karıştır
    const shuffled = dykList.sort(() => 0.5 - Math.random());

    for (const item of shuffled) {
      const rawText = item.text || '';
      
      const cleanSourceText = rawText
        .replace(/<[^>]*>/g, '')
        .replace(/^\.\.\.\s*that\s*/i, '')
        .replace(/^\.\.\.\s*/i, '')
        .trim();

      if (cleanSourceText.length < 15) continue;

      const isUsed = await isAlreadyPublished(env.DB, cleanSourceText);

      if (!isUsed) {
        let turkishText = await translateToTurkish(cleanSourceText);
        turkishText = turkishText.replace(/</g, '&lt;').replace(/>/g, '&gt;'); // HTML kaçış temizliği

        let articleUrl = 'https://en.wikipedia.org';
        if (item.pages && item.pages[0]?.content_urls?.desktop?.page) {
          articleUrl = item.pages[0].content_urls.desktop.page;
        }

        const message = `💡 <b>BUNU BİLİYOR MUYDUNUZ?</b>\n\n👀 ${turkishText}\n\n🔍 <a href="${articleUrl}">Kaynak ve Detaylar</a>`;

        const res = await sendTelegramMessage(env, message);
        console.log('Telegram Sonucu:', JSON.stringify(res));

        await recordPublished(env.DB, 'bbm', cleanSourceText);
        break;
      }
    }
  } catch (error) {
    console.error('handleDYK Çalışma Hatası:', error);
  }
}
