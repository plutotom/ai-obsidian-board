#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Start Obsidian Board
# @raycast.mode silent
# @raycast.icon 📋

PROJECT_DIR="$HOME/Documents/Coding/ai-obsidian-board"
PORT=3000
LOG_FILE="$PROJECT_DIR/.server.log"
PID_FILE="$PROJECT_DIR/.server.pid"

# Check if already running
if [ -f "$PID_FILE" ] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
  open "http://localhost:$PORT"
  echo "Already running — opened browser"
  exit 0
fi

# Start the dev server in background
cd "$PROJECT_DIR"
pnpm dev > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

# Wait for server to be ready
echo "Starting server..."
for i in {1..20}; do
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    open "http://localhost:$PORT"
    echo "Board is ready"
    exit 0
  fi
  sleep 0.5
done

echo "Server took too long to start — check $LOG_FILE"
