import { NextRequest, NextResponse } from "next/server";
import path from "path";
import db from "@/lib/db";
import { moveFile, getFilename } from "@/lib/vault";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cardId = decodeURIComponent(id);
  const { targetFolder } = await req.json();

  if (!targetFolder) {
    return NextResponse.json({ error: "targetFolder required" }, { status: 400 });
  }

  const filename = getFilename(cardId);
  const targetRelPath = path.join(targetFolder, filename);

  try {
    moveFile(cardId, targetRelPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Move failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Update card ID and remove from board (it's been filed)
  db.transaction(() => {
    db.prepare("DELETE FROM ai_jobs WHERE card_id = ?").run(cardId);
    db.prepare("DELETE FROM cards WHERE id = ?").run(cardId);
  })();

  return NextResponse.json({ ok: true, newPath: targetRelPath });
}
