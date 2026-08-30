async function calculateHash(text) {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function isAlreadyPublished(db, text, sourceId = null) {
  const hash = await calculateHash(text);
  
  if (sourceId) {
    const result = await db.prepare(
      'SELECT id FROM published_logs WHERE content_hash = ? OR source_id = ? LIMIT 1'
    ).bind(hash, sourceId).first();
    return !!result;
  }

  const result = await db.prepare(
    'SELECT id FROM published_logs WHERE content_hash = ? LIMIT 1'
  ).bind(hash).first();
  return !!result;
}

export async function recordPublished(db, category, text, sourceId = null) {
  const hash = await calculateHash(text);
  try {
    await db.prepare(
      'INSERT INTO published_logs (category, content_hash, source_id) VALUES (?, ?, ?)'
    ).bind(category, hash, sourceId).run();
    return true;
  } catch (error) {
    console.error('DB Insert error:', error);
    return false;
  }
}

export async function getUnusedQuote(db, category) {
  const row = await db.prepare(
    'SELECT id, quote, author, book_title FROM quotes_pool WHERE category = ? AND is_used = 0 ORDER BY RANDOM() LIMIT 1'
  ).bind(category).first();

  if (row) {
    await db.prepare('UPDATE quotes_pool SET is_used = 1 WHERE id = ?').bind(row.id).run();
    return row;
  }
  
  // Havuz biterse tekrar sıfırla
  await db.prepare('UPDATE quotes_pool SET is_used = 0 WHERE category = ?').bind(category).run();
  return await db.prepare(
    'SELECT id, quote, author, book_title FROM quotes_pool WHERE category = ? ORDER BY RANDOM() LIMIT 1'
  ).bind(category).first();
}
