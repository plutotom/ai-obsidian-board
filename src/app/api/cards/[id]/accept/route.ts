import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { writeFile } from "@/lib/vault";
import type { AiJob } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cardId = decodeURIComponent(id);

  const job = db
    .prepare(
      "SELECT * FROM ai_jobs WHERE card_id = ? AND status = 'done' ORDER BY created_at DESC LIMIT 1"
    )
    .get(cardId) as AiJob | undefined;

  if (!job || !job.proposed) {
    return NextResponse.json({ error: "No proposed content found" }, { status: 404 });
  }

  const accept = db.transaction(() => {
    writeFile(cardId, job.proposed!);
    db.prepare("UPDATE ai_jobs SET status = 'done' WHERE id = ?").run(job.id);
    db.prepare(
      "UPDATE cards SET column_id = 'ready-to-file', updated_at = datetime('now') WHERE id = ?"
    ).run(cardId);
  });

  accept();
  return NextResponse.json({ ok: true });
}
