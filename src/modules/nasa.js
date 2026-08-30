import { isAlreadyPublished, recordPublished } from '../db.js';
import { sendTelegramPhoto, sendTelegramMessage } from '../telegram.js';
import { translateToTurkish } from '../translate.js';

export async function handleNasa(env) {
  const url = `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY`;
  const response = await fetch(url);
  if (!response.ok) return;

  const data = await response.json();
  const sourceId = `nasa_${data.date}`;
  const isUsed = await isAlreadyPublished(env.DB, data.explanation, sourceId);

  if (!isUsed) {
    const trTitle = await translateToTurkish(data.title);
    const trExplanation = await translateToTurkish(data.explanation);

    const caption = `🌌 <b>GÜNÜN ASTRONOMİ GÖRSELİ (APOD)</b>\n\n<b>${trTitle}</b>\n\n${trExplanation}\n\n🔭 <i>Kaynak: NASA</i>`;

    if (data.media_type === 'image') {
      const imgUrl = data.hdurl || data.url;
      await sendTelegramPhoto(env, imgUrl, caption);
    } else {
      await sendTelegramMessage(env, `${caption}\n\n🎬 ${data.url}`);
    }

    await recordPublished(env.DB, 'nasa_apod', data.explanation, sourceId);
  }
}
