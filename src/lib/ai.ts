import Anthropic from "@anthropic-ai/sdk";
import { getSettings } from "./db";

export async function runAiReview(
  fileContent: string,
  prompt: string
): Promise<string> {
  const settings = getSettings();
  const provider = settings.ai_provider;

  if (provider === "ollama") {
    return runOllama(fileContent, prompt, settings.ollama_model);
  } else {
    return runAnthropic(fileContent, prompt, settings.anthropic_model);
  }
}

async function runOllama(
  content: string,
  prompt: string,
  model: string
): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: `${prompt}\n\n---\n\n${content}`,
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.response as string;
}

async function runAnthropic(
  content: string,
  prompt: string,
  model: string
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\n---\n\n${content}`,
      },
    ],
  });
  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}
