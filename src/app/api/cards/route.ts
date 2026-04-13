import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getInboxFiles, getFilename } from "@/lib/vault";
import type { Card } from "@/lib/db";

// GET /api/cards — list all cards
export async function GET() {
  const cards = db.prepare("SELECT * FROM cards ORDER BY updated_at DESC").all() as Card[];
  return NextResponse.json(cards);
}

// POST /api/cards — sync inbox folder with DB
export async function POST() {
  const inboxFiles = getInboxFiles();
  const existing = db.prepare("SELECT id FROM cards WHERE column_id = 'inbox'").all() as { id: string }[];
  const existingIds = new Set(existing.map((r) => r.id));

  const inboxIds = new Set(inboxFiles);

  const insertStmt = db.prepare(
    "INSERT OR IGNORE INTO cards (id, filename, column_id) VALUES (?, ?, 'inbox')"
  );
  const deleteStmt = db.prepare("DELETE FROM cards WHERE id = ?");

  const syncMany = db.transaction(() => {
    let added = 0;
    let removed = 0;

    // Add new files
    for (const relPath of inboxFiles) {
      if (!existingIds.has(relPath)) {
        insertStmt.run(relPath, getFilename(relPath));
        added++;
      }
    }

    // Remove cards whose files are gone from inbox (only inbox column)
    for (const id of existingIds) {
      if (!inboxIds.has(id)) {
        deleteStmt.run(id);
        removed++;
      }
    }

    return { added, removed };
  });

  const result = syncMany();
  return NextResponse.json({ ok: true, ...result });
}
