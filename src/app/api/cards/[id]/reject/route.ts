import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cardId = decodeURIComponent(id);

  db.transaction(() => {
    db.prepare(
      "UPDATE ai_jobs SET status = 'rejected' WHERE card_id = ? AND status = 'done'"
    ).run(cardId);
    db.prepare(
      "UPDATE cards SET column_id = 'inbox', updated_at = datetime('now') WHERE id = ?"
    ).run(cardId);
  })();

  return NextResponse.json({ ok: true });
}
