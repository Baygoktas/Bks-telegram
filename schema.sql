CREATE TABLE IF NOT EXISTS posted_content (
  content_hash TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  source_url TEXT,
  posted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_category ON posted_content(category);
