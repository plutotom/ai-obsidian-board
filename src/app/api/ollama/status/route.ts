import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  try {
    const res = await fetch(`${baseUrl}/api/version`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return NextResponse.json({ connected: false });
    }
    const data = await res.json();
    return NextResponse.json({ connected: true, version: data.version });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
