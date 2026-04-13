import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { AiJob } from "@/lib/db";

export async function GET(
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

  if (!job) {
    return NextResponse.json({ error: "No completed AI job found" }, { status: 404 });
  }

  return NextResponse.json({ original: job.original, proposed: job.proposed });
}
