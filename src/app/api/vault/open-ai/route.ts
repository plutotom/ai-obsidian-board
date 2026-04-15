import { execFile } from "child_process";
import path from "path";
import { NextResponse } from "next/server";

const VAULT_ROOT = process.env.VAULT_ROOT_PATH!;
const AI_DIR = path.join(VAULT_ROOT, "ai");

export async function POST() {
  await new Promise<void>((resolve, reject) => {
    execFile("open", [AI_DIR], (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  return NextResponse.json({ ok: true });
}
