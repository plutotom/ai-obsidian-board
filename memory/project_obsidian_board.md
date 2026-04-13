---
name: Obsidian Board project context
description: Local Kanban triage app for Obsidian vault inbox — stack, vault paths, build status
type: project
---

Local Next.js Kanban app at ~/Documents/Coding/ai-obsidian-board for triaging Obsidian vault inbox files.

**Why:** Private tool, runs on localhost:3000, launched via Raycast. AI processing via Ollama (primary) or Anthropic (fallback).

**Stack:** Next.js 16 App Router · Tailwind 4 · dnd-kit · react-markdown · better-sqlite3 · @anthropic-ai/sdk · pnpm

**Vault paths (from .env.local):**
- VAULT_INBOX_PATH = /Users/proctoi/Documents/Coding/Obsidian-PhD/inbox
- VAULT_ROOT_PATH = /Users/proctoi/Documents/Coding/Obsidian-PhD
- DB_PATH = /Users/proctoi/Documents/Coding/ai-obsidian-board/data/board.db

**Columns:** inbox → ai-review → needs-attention → ready-to-file → done

**Key files:**
- src/lib/db.ts — SQLite setup + schema + helpers
- src/lib/vault.ts — filesystem helpers
- src/lib/ai.ts — unified AI caller (Ollama or Anthropic)
- src/app/page.tsx — full Kanban board with dnd-kit
- src/app/settings/page.tsx — settings UI
- raycast/ — start-board.sh and stop-board.sh

**How to apply:** The Anthropic API key placeholder is still in .env.local — user needs to fill it in. Ollama defaults to llama3.2. Build was clean as of initial setup.
