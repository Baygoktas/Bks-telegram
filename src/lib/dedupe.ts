export interface Env {
  DB: D1Database;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeContentHash(category: string, uniqueKey: string): Promise<string> {
  return sha256(`${category}|${uniqueKey}`);
}

export async function isAlreadyPosted(db: D1Database, contentHash: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT content_hash FROM posted_content WHERE content_hash = ?")
    .bind(contentHash)
    .first();
  return row !== null;
}

export async function markAsPosted(
  db: D1Database,
  contentHash: string,
  category: string,
  sourceUrl: string
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO posted_content (content_hash, category, source_url, posted_at) VALUES (?, ?, ?, ?)"
    )
    .bind(contentHash, category, sourceUrl, new Date().toISOString())
    .run();
}
