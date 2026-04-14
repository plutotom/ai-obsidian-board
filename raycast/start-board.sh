#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Start Obsidian Board
# @raycast.mode compact
# @raycast.icon 📋

set -u

PROJECT_DIR="$HOME/Documents/Coding/ai-obsidian-board"
PORT=5872
LOG_FILE="$PROJECT_DIR/.server.log"
PID_FILE="$PROJECT_DIR/.server.pid"
PNPM_BIN=""

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Project directory not found: $PROJECT_DIR"
  exit 1
fi

resolve_pnpm() {
  local candidate=""

  if command -v pnpm >/dev/null 2>&1; then
    candidate="$(command -v pnpm)"
    if "$candidate" --version >/dev/null 2>&1; then
      PNPM_BIN="$candidate"
      return 0
    fi
  fi

  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.nvm/nvm.sh"
    if command -v pnpm >/dev/null 2>&1; then
      candidate="$(command -v pnpm)"
      if "$candidate" --version >/dev/null 2>&1; then
        PNPM_BIN="$candidate"
        return 0
      fi
    fi
  fi

  return 1
}

if ! resolve_pnpm; then
  echo "A working pnpm binary was not found. PATH=$PATH"
  exit 1
fi

if [ -f "$PID_FILE" ]; then
  EXISTING_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${EXISTING_PID:-}" ] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    open "http://localhost:$PORT"
    echo "Already running - opened browser"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

cd "$PROJECT_DIR"
"$PNPM_BIN" dev > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
NEW_PID=$!

echo "Starting server..."
for i in {1..40}; do
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    open "http://localhost:$PORT"
    echo "Board is ready"
    exit 0
  fi
  if ! kill -0 "$NEW_PID" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "Server exited early - check $LOG_FILE"
    exit 1
  fi
  sleep 0.5
done

echo "Server is still starting - check $LOG_FILE"
