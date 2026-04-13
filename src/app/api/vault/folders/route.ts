import { NextResponse } from "next/server";
import { getAllFolders } from "@/lib/vault";

export async function GET() {
  const folders = getAllFolders();
  return NextResponse.json(folders);
}
