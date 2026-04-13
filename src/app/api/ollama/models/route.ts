import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return NextResponse.json({ models: [] });
    }
    const data = await res.json();
    const models = (data.models || []).map((m: { name: string }) => m.name);
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] });
  }
}
