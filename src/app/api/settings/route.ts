import { NextRequest, NextResponse } from "next/server";
import { getSettings, setSetting } from "@/lib/db";

export async function GET() {
  const settings = getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const { key, value } = await req.json();

  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  setSetting(key, value);
  return NextResponse.json({ ok: true });
}
