import { getUnusedQuote } from '../db.js';
import { sendTelegramMessage } from '../telegram.js';

export async function handleQuotes(env, categoryType) {
  const quoteData = await getUnusedQuote(env.DB, categoryType);
  if (!quoteData) return;

  let message = '';
  if (categoryType === 'kitap') {
    message = `📚 <b>GÜNÜN KİTAP ALINTISI</b>\n\n<i>"${quoteData.quote}"</i>\n\n✍️ <b>${quoteData.author}</b>\n📖 <i>${quoteData.book_title || ''}</i>`;
  } else {
    message = `💭 <b>DÜŞÜNÜR & FİLOZOF SÖZLERİ</b>\n\n<i>"${quoteData.quote}"</i>\n\n🏛 <b>${quoteData.author}</b>`;
  }

  await sendTelegramMessage(env, message);
}
