import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH =
  process.env.DB_PATH ||
  path.join(process.cwd(), "data", "board.db");

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id          TEXT PRIMARY KEY,
    filename    TEXT NOT NULL,
    column_id   TEXT NOT NULL DEFAULT 'inbox',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ai_jobs (
    id           TEXT PRIMARY KEY,
    card_id      TEXT NOT NULL REFERENCES cards(id),
    status       TEXT NOT NULL DEFAULT 'queued',
    original     TEXT,
    proposed     TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO settings VALUES ('ai_provider', 'ollama');
  INSERT OR IGNORE INTO settings VALUES ('ollama_model', 'llama3.2');
  INSERT OR IGNORE INTO settings VALUES ('anthropic_model', 'claude-haiku-4-5-20251001');
  INSERT OR IGNORE INTO settings VALUES ('ai_prompt', 'You are a personal knowledge management assistant. Given a raw markdown note, your job is to:
1. Fix any spelling or grammar errors. Make minimal changes — preserve the author''s voice exactly.
2. Add YAML frontmatter at the top of the file with these fields:
   - title: (a clean title inferred from the content or first heading)
   - tags: (an array of 2-5 relevant lowercase tags, no spaces — use hyphens)
   - created: (leave this field blank — do not invent dates)
   - status: inbox
   - type: (one of: note, reference, project, journal — infer from content)
3. Do not restructure or rewrite the body. Only fix clear errors.
4. Return ONLY the complete updated markdown file. No explanation, no preamble, no code fences.');
`);

export default db;

export type Card = {
  id: string;
  filename: string;
  column_id: string;
  created_at: string;
  updated_at: string;
};

export type AiJob = {
  id: string;
  card_id: string;
  status: string;
  original: string | null;
  proposed: string | null;
  created_at: string;
};

export type Settings = Record<string, string>;

export function getSettings(): Settings {
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function getSetting(key: string): string | null {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    key,
    value
  );
}
