import { isAlreadyPublished, recordPublished } from '../db.js';
import { sendTelegramPhoto } from '../telegram.js';
import { translateToTurkish } from '../translate.js';

export async function handleArt(env) {
  const page = Math.floor(Math.random() * 50) + 1;
  const url = `https://api.artic.edu/api/v1/artworks/search?query[term][is_public_domain]=true&limit=15&page=${page}&fields=id,title,artist_title,date_display,image_id,thumbnail`;
  
  const response = await fetch(url, { headers: { 'User-Agent': 'TelegramBot/1.0' } });
  if (!response.ok) return;

  const data = await response.json();
  const artworks = data.data || [];

  for (const art of artworks) {
    if (!art.image_id) continue;
    
    const isUsed = await isAlreadyPublished(env.DB, String(art.id), `art_${art.id}`);
    if (!isUsed) {
      const imageUrl = `https://www.artic.edu/iiif/2/${art.image_id}/full/843,/0/default.jpg`;
      const artist = art.artist_title || 'Bilinmeyen Sanatçı';
      const date = art.date_display || 'Tarihsiz';
      const trTitle = await translateToTurkish(art.title);

      const caption = `🎨 <b>GÜNÜN SANAT ESERİ</b>\n\n🏛 <b>Eser:</b> ${trTitle}\n👨‍🎨 <b>Sanatçı:</b> ${artist}\n📅 <b>Dönem:</b> ${date}\n\n🏛 <i>Kaynak: Art Institute of Chicago</i>`;

      await sendTelegramPhoto(env, imageUrl, caption);
      await recordPublished(env.DB, 'sanat', String(art.id), `art_${art.id}`);
      break;
    }
  }
}
