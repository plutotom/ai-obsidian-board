#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Stop Obsidian Board
# @raycast.mode compact
# @raycast.icon 🛑

set -u

PROJECT_DIR="$HOME/Documents/Coding/ai-obsidian-board"
PID_FILE="$PROJECT_DIR/.server.pid"
PORT=5872

terminate_pid() {
  local pid="$1"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    sleep 0.5
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
}

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${PID:-}" ]; then
    terminate_pid "$PID"
  fi
  rm -f "$PID_FILE"
fi

PORT_PIDS="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PORT_PIDS" ]; then
  while IFS= read -r pid; do
    [ -n "$pid" ] && terminate_pid "$pid"
  done <<< "$PORT_PIDS"
fi

if [ -z "${PORT_PIDS:-}" ] && [ ! -f "$PID_FILE" ]; then
  if [ -n "${PID:-}" ]; then
    echo "Board stopped"
  else
    echo "Stopped (no running process found)"
  fi
else
  echo "Board stopped"
fi
