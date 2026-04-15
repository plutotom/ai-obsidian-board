"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DEFAULT_PROMPT = `You are a personal knowledge management assistant for Obsidian markdown notes.

## Hard rules (do not break these)
1. **Preserve existing metadata lines at the top of the file.** If the input has lines such as \`Last edit date: ...\`, \`Created Date: ...\`, or any similar key/value lines before the main content, copy them into your output **verbatim** (same text, same order). Do not delete, blank out, or replace them with YAML unless the input already used YAML for those values.
2. **Do not remove body content.** Keep all headings, paragraphs, blockquotes (\`> ...\`), lists, code blocks, and wikilinks unless you are only fixing an obvious spelling/grammar typo inside them. Never drop a blockquote or section to “clean up” the note.
3. **Minimal edits:** fix clear spelling/grammar mistakes only; do not rephrase for style.

## YAML frontmatter (only when helpful)
- If the note **already** has a valid \`---\` … \`---\` YAML block at the very top, update fields only as needed; do not strip other top-of-file metadata that sits outside that block—keep it.
- If there is **no** YAML block but you add one, put it at the **top** only when it does not require removing the user’s \`Last edit date\` / \`Created Date\` lines. **Preferred layout when those lines exist:** output those legacy lines first (unchanged), then a blank line, then a YAML block if still needed, then the rest of the note. If that would duplicate dates awkwardly, keep the legacy lines only and skip adding YAML.
- When YAML is used, include: title, tags (2–5 lowercase hyphenated tags), created (blank unless a real date is already in the file you can copy), status: inbox, type (note | reference | project | journal | meeting), source (blank unless a clip URL exists in the note).

## Output
Return ONLY the full markdown file. No explanation, no preamble, no markdown code fences around the whole file.`;

type Settings = {
  ai_provider: string;
  ollama_model: string;
  anthropic_model: string;
  ai_prompt: string;
  anthropic_api_key?: string;
};

type VaultSkillFile = {
  path: string;
  status: "loaded" | "available" | "missing";
};

const ANTHROPIC_MODELS = [
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    ai_provider: "ollama",
    ollama_model: "llama3.2",
    anthropic_model: "claude-haiku-4-5-20251001",
    ai_prompt: DEFAULT_PROMPT,
  });
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<{
    connected: boolean;
    version?: string;
  } | null>(null);
  const [ollamaTesting, setOllamaTesting] = useState(false);
  const [anthropicTesting, setAnthropicTesting] = useState(false);
  const [anthropicStatus, setAnthropicStatus] = useState<boolean | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [skillFiles, setSkillFiles] = useState<VaultSkillFile[]>([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setSettings({
          ai_provider: data.ai_provider ?? "ollama",
          ollama_model: data.ollama_model ?? "llama3.2",
          anthropic_model: data.anthropic_model ?? "claude-haiku-4-5-20251001",
          ai_prompt: data.ai_prompt ?? DEFAULT_PROMPT,
        });
        if (data.anthropic_api_key) {
          setApiKey(data.anthropic_api_key);
          setSavedKey(data.anthropic_api_key);
        }
      });

    fetch("/api/ollama/models")
      .then((r) => r.json())
      .then((data) => setOllamaModels(data.models ?? []));

    fetch("/api/vault/skills")
      .then((r) => r.json())
      .then((data: { files?: VaultSkillFile[] }) => {
        setSkillFiles(data.files ?? []);
      });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function saveSetting(key: string, value: string) {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  async function handleProviderChange(provider: string) {
    setSettings((s) => ({ ...s, ai_provider: provider }));
    await saveSetting("ai_provider", provider);
  }

  async function handleOllamaModelChange(model: string) {
    setSettings((s) => ({ ...s, ollama_model: model }));
    await saveSetting("ollama_model", model);
  }

  async function handleAnthropicModelChange(model: string) {
    setSettings((s) => ({ ...s, anthropic_model: model }));
    await saveSetting("anthropic_model", model);
  }

  async function handleTestOllama() {
    setOllamaTesting(true);
    setOllamaStatus(null);
    const res = await fetch("/api/ollama/status");
    const data = await res.json();
    setOllamaStatus(data);
    setOllamaTesting(false);
  }

  async function handleTestAnthropic() {
    setAnthropicTesting(true);
    setAnthropicStatus(null);
    // Save key first, then test by hitting a lightweight endpoint
    await saveSetting("anthropic_api_key", apiKey);
    setSavedKey(apiKey);
    try {
      // Quick validation: just check the key is non-empty and looks right
      const ok = apiKey.startsWith("sk-ant-") && apiKey.length > 20;
      setAnthropicStatus(ok);
    } catch {
      setAnthropicStatus(false);
    }
    setAnthropicTesting(false);
  }

  async function handleSaveApiKey() {
    await saveSetting("anthropic_api_key", apiKey);
    setSavedKey(apiKey);
    showToast("API key saved");
  }

  async function handleSavePrompt() {
    setSaving(true);
    await saveSetting("ai_prompt", settings.ai_prompt);
    setSaving(false);
    showToast("Prompt saved");
  }

  async function handleOpenAiFolder() {
    const res = await fetch("/api/vault/open-ai", { method: "POST" });
    if (!res.ok) {
      showToast("Could not open ai folder");
      return;
    }
    showToast("Opened ai folder");
  }

  function getSkillStatusPrefix(status: VaultSkillFile["status"]): string {
    if (status === "loaded") return "✅";
    if (status === "missing") return "❌";
    return "⬜";
  }

  function getSkillStatusText(status: VaultSkillFile["status"]): string {
    if (status === "loaded") return "text-green-400";
    if (status === "missing") return "text-red-400";
    return "text-zinc-500";
  }

  function handleResetPrompt() {
    setSettings((s) => ({ ...s, ai_prompt: DEFAULT_PROMPT }));
  }

  const maskedKey = savedKey
    ? savedKey.slice(0, 10) + "•".repeat(Math.min(20, savedKey.length - 10))
    : "";

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-950">
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Board
        </Link>
        <span className="text-sm font-semibold text-zinc-200">Settings</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        {/* Section 1 — AI Provider */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
            AI Provider
          </h2>
          <div className="space-y-2">
            {[
              { id: "ollama", label: "Ollama", sub: "Local, free" },
              { id: "anthropic", label: "Anthropic", sub: "API key required" },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  settings.ai_provider === opt.id
                    ? "border-blue-600 bg-blue-950/30"
                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value={opt.id}
                  checked={settings.ai_provider === opt.id}
                  onChange={() => handleProviderChange(opt.id)}
                  className="accent-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-zinc-200">{opt.label}</div>
                  <div className="text-xs text-zinc-500">{opt.sub}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Section 2 — Ollama config */}
        {settings.ai_provider === "ollama" && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
              Ollama
            </h2>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-5">
              {/* Connection test */}
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleTestOllama}
                    disabled={ollamaTesting}
                    className="px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {ollamaTesting ? "Testing..." : "Test Connection"}
                  </button>
                  {ollamaStatus !== null && (
                    <span
                      className={`text-xs flex items-center gap-1.5 ${
                        ollamaStatus.connected ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${ollamaStatus.connected ? "bg-green-500" : "bg-red-500"}`} />
                      {ollamaStatus.connected
                        ? `Connected — Ollama ${ollamaStatus.version ?? ""}`
                        : "Not connected — is Ollama running?"}
                    </span>
                  )}
                </div>
              </div>

              {/* Model picker */}
              <div>
                <label className="text-xs text-zinc-400 block mb-2">Model</label>
                {ollamaModels.length > 0 ? (
                  <select
                    value={settings.ollama_model}
                    onChange={(e) => handleOllamaModelChange(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-500 w-full"
                  >
                    {ollamaModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={settings.ollama_model}
                      onChange={(e) => handleOllamaModelChange(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-500 w-full"
                    />
                    <p className="text-xs text-zinc-600 mt-1.5">
                      To install a model:{" "}
                      <code className="font-mono text-zinc-500">ollama pull llama3.2</code>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Section 3 — Anthropic config */}
        {settings.ai_provider === "anthropic" && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
              Anthropic
            </h2>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-5">
              {/* API Key */}
              <div>
                <label className="text-xs text-zinc-400 block mb-2">API Key</label>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-500 font-mono"
                  />
                  <button
                    onClick={() => setShowApiKey((v) => !v)}
                    className="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg transition-colors"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={handleSaveApiKey}
                    className="px-3 py-2 text-xs text-zinc-200 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                </div>
                {savedKey && !showApiKey && (
                  <p className="text-xs text-zinc-600 mt-1.5 font-mono">{maskedKey}</p>
                )}
              </div>

              {/* Model picker */}
              <div>
                <label className="text-xs text-zinc-400 block mb-2">Model</label>
                <select
                  value={settings.anthropic_model}
                  onChange={(e) => handleAnthropicModelChange(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-500 w-full"
                >
                  {ANTHROPIC_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Test */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleTestAnthropic}
                  disabled={anthropicTesting || !apiKey}
                  className="px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {anthropicTesting ? "Testing..." : "Test Connection"}
                </button>
                {anthropicStatus !== null && (
                  <span
                    className={`text-xs flex items-center gap-1.5 ${
                      anthropicStatus ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${anthropicStatus ? "bg-green-500" : "bg-red-500"}`} />
                    {anthropicStatus ? "Key looks valid" : "Key looks invalid"}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Section 4 — Prompt editor */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
            AI Prompt
          </h2>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
            <textarea
              value={settings.ai_prompt}
              onChange={(e) =>
                setSettings((s) => ({ ...s, ai_prompt: e.target.value }))
              }
              rows={14}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-zinc-600">
                {settings.ai_prompt.length} chars
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleResetPrompt}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Reset to default
                </button>
                <button
                  onClick={handleSavePrompt}
                  disabled={saving}
                  className="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save prompt"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 — Vault Knowledge Base */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
            Vault Knowledge Base
          </h2>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
            <p className="text-xs text-zinc-400">
              Only paths marked loaded are prepended to each AI review. Other files under{" "}
              <code className="text-zinc-500">ai/</code> exist for you in Obsidian but are not
              auto-injected (keeps local models focused).
            </p>
            <div className="space-y-1.5">
              {skillFiles.length === 0 ? (
                <p className="text-xs text-zinc-500">No skill files discovered yet.</p>
              ) : (
                skillFiles.map((file) => (
                  <div key={`${file.status}-${file.path}`} className={`text-xs font-mono ${getSkillStatusText(file.status)}`}>
                    {getSkillStatusPrefix(file.status)}  {file.path}
                    {file.status === "available" && " (not auto-loaded)"}
                  </div>
                ))
              )}
            </div>
            <button
              onClick={handleOpenAiFolder}
              className="px-3 py-2 text-xs text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700"
            >
              Open ai/ folder in Finder
            </button>
          </div>
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-4 py-2.5 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
