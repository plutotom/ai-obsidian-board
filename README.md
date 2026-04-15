# AI Obsidian Board

A local-first kanban board for triaging markdown notes from your Obsidian vault inbox.

The app syncs `.md` files from a vault inbox folder into a board, lets you drag cards through review stages, and can run AI-assisted copy edits/frontmatter generation before you file notes into final vault folders.

## What It Does

- Syncs notes from `inbox/` into a board-backed SQLite database
- Shows cards in columns: `Inbox`, `AI Review`, `Needs Attention`, `Ready to File`, `Done`
- Supports drag-and-drop card movement across columns
- Runs AI review (Ollama or Anthropic) and stores original/proposed markdown diffs
- Lets you accept/reject AI suggestions
- Moves finalized notes into any folder in your vault and removes them from the board

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- `better-sqlite3` (local DB at `data/board.db` by default)
- `@dnd-kit` for board interactions

## Requirements

- Node.js 20+
- `pnpm`
- An Obsidian vault on local disk
- One AI provider:
  - Ollama (local)
  - Anthropic API key

## Environment Variables

Create a `.env.local` file in the project root:

```bash
VAULT_ROOT_PATH="/absolute/path/to/your/obsidian-vault"
VAULT_INBOX_PATH="/absolute/path/to/your/obsidian-vault/inbox"

# Optional
DB_PATH="/absolute/path/to/custom/board.db"
OLLAMA_BASE_URL="http://localhost:11434"
ANTHROPIC_API_KEY="sk-ant-..."
```

Notes:

- `VAULT_ROOT_PATH` and `VAULT_INBOX_PATH` are required for vault file operations.
- `DB_PATH` is optional; default is `data/board.db`.
- `OLLAMA_BASE_URL` defaults to `http://localhost:11434`.
- `ANTHROPIC_API_KEY` is only required when using Anthropic as provider.

## Local Development

```bash
pnpm install
pnpm dev
```

The app runs on [http://localhost:5872](http://localhost:5872).

Other scripts:

```bash
pnpm build
pnpm start
```

## How to Use

1. Open the board and click **Sync** to import notes from the inbox folder.
2. Drag a card into **AI Review** to run the current AI prompt/provider.
3. Review results in **Needs Attention**:
   - **Accept** writes proposed markdown and moves card to **Ready to File**
   - **Reject** moves card back to **Inbox**
4. Use **Move to folder** to file the note anywhere in your vault.

## Settings

Use `/settings` to configure:

- AI provider (`ollama` or `anthropic`)
- Model selection
- Anthropic API key (stored in local settings table)
- AI prompt used for note cleanup/frontmatter generation

## Raycast Scripts

This repo includes helper scripts in `raycast/`:

- `raycast/start-board.sh` starts `pnpm dev`, writes logs to `.server.log`, saves PID to `.server.pid`, and opens the app
- `raycast/stop-board.sh` stops the tracked process (and any process listening on port `5872`)

## API Surface (High-Level)

- `GET/POST /api/cards` list cards and sync inbox files
- `POST /api/cards/[id]/move` move between board columns
- `GET /api/cards/[id]/content` fetch note content
- `POST /api/cards/[id]/ai-review` run AI review for a card
- `GET /api/cards/[id]/ai-diff` fetch original/proposed diff
- `POST /api/cards/[id]/accept` accept AI output
- `POST /api/cards/[id]/reject` reject AI output
- `POST /api/cards/[id]/move-to-folder` move note into a vault folder
- `GET/PUT /api/settings` read/update app settings
- `GET /api/ollama/models` and `GET /api/ollama/status` for Ollama integration
- `GET /api/vault/folders` list available vault folders
