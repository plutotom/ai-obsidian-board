import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  buildSkillContext,
  ALWAYS_LOAD_SKILL_PATHS,
  ON_DEMAND_SKILL_PATHS,
} from "@/lib/ai";

const VAULT_ROOT = process.env.VAULT_ROOT_PATH!;
const AI_DIR = path.join(VAULT_ROOT, "ai");

const INJECTED_PATHS = new Set<string>(ALWAYS_LOAD_SKILL_PATHS);

type SkillFileStatus = "loaded" | "available" | "missing";

function walkDir(dir: string, base: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      results.push(...walkDir(full, base));
    } else if (entry.name.endsWith(".md")) {
      results.push(rel);
    }
  }
  return results;
}

export async function GET() {
  const files = walkDir(AI_DIR, VAULT_ROOT).sort((a, b) => a.localeCompare(b));

  const expectedMissing = ALWAYS_LOAD_SKILL_PATHS.filter((f) => !files.includes(f)).map(
    (path) => ({ path, status: "missing" as SkillFileStatus })
  );

  const listed = files.map((path) => ({
    path,
    status: (INJECTED_PATHS.has(path) ? "loaded" : "available") as SkillFileStatus,
  }));

  return NextResponse.json({
    files: [...expectedMissing, ...listed],
    autoLoaded: [...ALWAYS_LOAD_SKILL_PATHS],
    optionalVaultPaths: [...ON_DEMAND_SKILL_PATHS],
    hasSkillContext: buildSkillContext().length > 0,
  });
}
