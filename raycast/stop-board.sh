#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Stop Obsidian Board
# @raycast.mode silent
# @raycast.icon 🛑

PROJECT_DIR="$HOME/Documents/Coding/ai-obsidian-board"
PID_FILE="$PROJECT_DIR/.server.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  kill "$PID" 2>/dev/null
  lsof -ti:3000 | xargs kill -9 2>/dev/null
  rm "$PID_FILE"
  echo "Board stopped"
else
  lsof -ti:3000 | xargs kill -9 2>/dev/null
  echo "Stopped (no PID file found)"
fi
