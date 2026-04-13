import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { column_id } = await req.json();

  if (!column_id) {
    return NextResponse.json({ error: "column_id required" }, { status: 400 });
  }

  const result = db
    .prepare(
      "UPDATE cards SET column_id = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .run(column_id, decodeURIComponent(id));

  if (result.changes === 0) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
