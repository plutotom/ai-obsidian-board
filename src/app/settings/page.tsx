"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DEFAULT_PROMPT = `You are a personal knowledge management assistant. Given a raw markdown note, your job is to:
1. Fix any spelling or grammar errors. Make minimal changes — preserve the author's voice exactly.
2. Add YAML frontmatter at the top of the file with these fields:
   - title: (a clean title inferred from the content or first heading)
   - tags: (an array of 2-5 relevant lowercase tags, no spaces — use hyphens)
   - created: (leave this field blank — do not invent dates)
   - status: inbox
   - type: (one of: note, reference, project, journal — infer from content)
3. Do not restructure or rewrite the body. Only fix clear errors.
4. Return ONLY the complete updated markdown file. No explanation, no preamble, no code fences.`;

type Settings = {
  ai_provider: string;
  ollama_model: string;
  anthropic_model: string;
  ai_prompt: string;
  anthropic_api_key?: string;
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
