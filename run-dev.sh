#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=1024"

# Start dev server
npx next dev -p 3000 -H 0.0.0.0 &
DEV_PID=$!

# Wait for it to start
sleep 5

# Keep this script alive to prevent orphaned process
while kill -0 $DEV_PID 2>/dev/null; do
  sleep 5
done

echo "Dev server exited"
