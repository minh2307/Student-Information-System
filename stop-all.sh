#!/usr/bin/env bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "Stopping all Rikkei EduPortal background services..."

if [ -f .pids ]; then
    while read -r pid; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            echo "Killing PID $pid..."
            kill "$pid" 2>/dev/null || true
        fi
    done < .pids
    rm -f .pids
fi

# Kill any leftover java processes on project ports
for port in 8080 8081 8082 8083 8084 8085 5173; do
    pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo "Killing leftover process on port $port (PID: $pid)..."
        kill -9 $pid 2>/dev/null || true
    fi
done

echo "All services stopped."
