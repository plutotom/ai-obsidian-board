import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { readFile } from "@/lib/vault";
import { runAiReview } from "@/lib/ai";
import { getSetting } from "@/lib/db";
import type { Card } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cardId = decodeURIComponent(id);

  const card = db.prepare("SELECT * FROM cards WHERE id = ?").get(cardId) as Card | undefined;
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  let original: string;
  try {
    original = readFile(cardId);
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  const prompt = getSetting("ai_prompt") || "";
  const jobId = randomUUID();

  // Insert queued job
  db.prepare(
    "INSERT INTO ai_jobs (id, card_id, status, original) VALUES (?, ?, 'processing', ?)"
  ).run(jobId, cardId, original);

  try {
    const proposed = await runAiReview(original, prompt);

    db.prepare(
      "UPDATE ai_jobs SET status = 'done', proposed = ? WHERE id = ?"
    ).run(proposed, jobId);

    // Move card to needs-attention so user can review
    db.prepare(
      "UPDATE cards SET column_id = 'needs-attention', updated_at = datetime('now') WHERE id = ?"
    ).run(cardId);

    return NextResponse.json({ ok: true, jobId });
  } catch (err) {
    db.prepare(
      "UPDATE ai_jobs SET status = 'rejected' WHERE id = ?"
    ).run(jobId);

    // Move card back to inbox on failure
    db.prepare(
      "UPDATE cards SET column_id = 'inbox', updated_at = datetime('now') WHERE id = ?"
    ).run(cardId);

    const message = err instanceof Error ? err.message : "AI processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
