import { isAlreadyPublished, recordPublished } from '../db.js';
import { sendTelegramMessage } from '../telegram.js';
import { translateToTurkish } from '../translate.js';

export async function handleDYK(env) {
  // Rastgele bir geçmiş ay ve gün seçerek havuzu sınırsız yapıyoruz
  const randomMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const randomDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const randomYear = Math.floor(Math.random() * (2025 - 2018 + 1)) + 2018;

  const url = `https://en.wikipedia.org/api/rest_v1/feed/featured/${randomYear}/${randomMonth}/${randomDay}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'TelegramBot/1.0' } });

  if (!response.ok) return;
  const data = await response.json();
  const dykList = data.dyk || [];

  if (dykList.length === 0) return;

  // Rastgele karıştır
  const shuffled = dykList.sort(() => 0.5 - Math.random());

  for (const item of shuffled) {
    let rawText = item.text || '';
    
    // HTML etiketlerini ve ... that kalıplarını temizle
    const cleanSourceText = rawText
      .replace(/<[^>]*>/g, '')
      .replace(/^\.\.\.\s*that\s*/i, '')
      .replace(/^\.\.\.\s*/i, '')
      .trim();

    if (cleanSourceText.length < 20) continue;

    const isUsed = await isAlreadyPublished(env.DB, cleanSourceText);

    if (!isUsed) {
      // Çeviriyi yap
      const turkishText = await translateToTurkish(cleanSourceText);

      // İlgili makalenin Wikipedia bağlantısı
      let articleUrl = 'https://en.wikipedia.org/wiki/Portal:Contents';
      if (item.pages && item.pages[0]?.content_urls?.desktop?.page) {
        articleUrl = item.pages[0].content_urls.desktop.page;
      }

      const message = `💡 <b>BUNU BİLİYOR MUYDUNUZ?</b>\n\n👀 ${turkishText}\n\n🔍 <a href="${articleUrl}">Kaynak ve Detaylar</a>`;

      await sendTelegramMessage(env, message);
      await recordPublished(env.DB, 'bbm', cleanSourceText);
      break;
    }
  }
}
