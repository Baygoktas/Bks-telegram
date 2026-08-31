import { translateToTurkish } from "../lib/translate";
import { makeContentHash, isAlreadyPosted, markAsPosted } from "../lib/dedupe";
import { sendTelegramPhoto } from "../lib/telegram";

export interface ArtEnv {
  DB: D1Database;
  DEEPL_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
}

interface ArtworkResult {
  title: string;
  artist: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  museumName: string;
}

// --- Met Museum ---
async function fetchFromMet(): Promise<ArtworkResult | null> {
  // Met'in halka açık, resim içeren ve public domain nesne ID aralığı yaklaşık 1-900000 arası
  const randomId = Math.floor(Math.random() * 900000) + 1;
  const url = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${randomId}`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data: any = await res.json();

  if (!data.isPublicDomain || !data.primaryImage) return null;

  return {
    title: data.title || "İsimsiz Eser",
    artist: data.artistDisplayName || "Bilinmeyen Sanatçı",
    description: data.objectDate ? `${data.medium || ""} (${data.objectDate})` : (data.medium || ""),
    imageUrl: data.primaryImage,
    sourceUrl: data.objectURL || url,
    museumName: "The Metropolitan Museum of Art",
  };
}

// --- Art Institute of Chicago ---
async function fetchFromAIC(): Promise<ArtworkResult | null> {
  const url = `https://api.artic.edu/api/v1/artworks/search?query[term][is_public_domain]=true&limit=1&page=${
    Math.floor(Math.random() * 500) + 1
  }&fields=id,title,artist_display,date_display,image_id,description`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data: any = await res.json();

  const item = data.data?.[0];
  if (!item || !item.image_id) return null;

  const imageUrl = `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`;

  return {
    title: item.title || "İsimsiz Eser",
    artist: item.artist_display || "Bilinmeyen Sanatçı",
    description: item.date_display || "",
    imageUrl,
    sourceUrl: `https://www.artic.edu/artworks/${item.id}`,
    museumName: "Art Institute of Chicago",
  };
}

export async function postArt(env: ArtEnv): Promise<void> {
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const useMet = Math.random() < 0.5;

    let artwork: ArtworkResult | null = null;
    try {
      artwork = useMet ? await fetchFromMet() : await fetchFromAIC();
    } catch (e) {
      console.log(`Sanat eseri fetch hatası (${useMet ? "Met" : "AIC"}): ${e}`);
      continue;
    }

    if (!artwork) continue;

    const hash = await makeContentHash("art", artwork.sourceUrl);
    const posted = await isAlreadyPosted(env.DB, hash);
    if (posted) continue;

    const titleTr = await translateToTurkish(artwork.title, env.DEEPL_API_KEY);
    const descriptionTr = artwork.description
      ? await translateToTurkish(artwork.description, env.DEEPL_API_KEY)
      : "";

    let caption = `🎨 <b>${titleTr}</b>\n${artwork.artist}\n${descriptionTr}\n\n🔗 Kaynak: <a href="${artwork.sourceUrl}">${artwork.museumName}</a>`;
    if (caption.length > 1024) {
      caption = `🎨 <b>${titleTr}</b>\n${artwork.artist}\n\n🔗 Kaynak: <a href="${artwork.sourceUrl}">${artwork.museumName}</a>`;
    }

    await sendTelegramPhoto(env, artwork.imageUrl, caption);
    await markAsPosted(env.DB, hash, "art", artwork.sourceUrl);
    return;
  }

  console.log("Sanat eseri: uygun yeni içerik bulunamadı.");
}
