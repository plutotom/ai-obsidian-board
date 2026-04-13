import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/vault";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const content = readFile(decodeURIComponent(id));
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
