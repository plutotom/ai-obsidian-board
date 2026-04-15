import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { getSettings } from "./db";

const VAULT_ROOT = process.env.VAULT_ROOT_PATH!;

/** Injected on every AI review. Keep small for local models — add paths here if you want more context. */
export const ALWAYS_LOAD_SKILL_PATHS = [
  "ai/skills/yaml-frontmatter/SKILL.md",
] as const;

/** Not injected by default. Listed in Settings as “available” only. */
export const ON_DEMAND_SKILL_PATHS = [
  "ai/skills/note-formatting/SKILL.md",
  "ai/references/tag-taxonomy.md",
  "ai/skills/vault-structure/SKILL.md",
  "ai/references/folder-map.md",
] as const;

function readIfExists(relPath: string): string | null {
  const full = path.join(VAULT_ROOT, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf-8");
}

export function buildSkillContext(): string {
  const sections: string[] = [];

  for (const relPath of ALWAYS_LOAD_SKILL_PATHS) {
    const content = readIfExists(relPath);
    if (content) {
      sections.push(`### ${relPath}\n\n${content}`);
    }
  }

  if (sections.length === 0) return "";

  return `## Vault Knowledge Base\n\nThe following files from this vault provide context for your task. Use them:\n\n${sections.join("\n\n---\n\n")}`;
}

export async function runAiReview(
  fileContent: string,
  prompt: string
): Promise<string> {
  const settings = getSettings();
  const provider = settings.ai_provider;
  const skillContext = buildSkillContext();
  const fullPrompt = skillContext
    ? `${prompt}\n\n${skillContext}\n\n---\n\nNOTE TO PROCESS:\n\n${fileContent}`
    : `${prompt}\n\n---\n\n${fileContent}`;

  if (provider === "ollama") {
    return runOllama(fullPrompt, settings.ollama_model);
  } else {
    return runAnthropic(fullPrompt, settings.anthropic_model);
  }
}

async function runOllama(fullPrompt: string, model: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.response as string;
}

async function runAnthropic(fullPrompt: string, model: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: fullPrompt,
      },
    ],
  });
  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}
