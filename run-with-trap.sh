#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=512"

# Trap all signals and log them
trap 'echo "Received SIGHUP at $(date)" >> /tmp/signals.log' SIGHUP
trap 'echo "Received SIGINT at $(date)" >> /tmp/signals.log' SIGINT
trap 'echo "Received SIGTERM at $(date)" >> /tmp/signals.log' SIGTERM
trap 'echo "Received SIGUSR1 at $(date)" >> /tmp/signals.log' SIGUSR1
trap 'echo "Received SIGUSR2 at $(date)" >> /tmp/signals.log' SIGUSR2

echo "Launcher started at $(date), PID=$$" > /tmp/signals.log

# Start production server
npx next start -p 3000 -H 0.0.0.0 &
CHILD_PID=$!

echo "Next server PID: $CHILD_PID" >> /tmp/signals.log

# Wait for child
wait $CHILD_PID
EXIT_CODE=$?
echo "Next server exited at $(date) with code $EXIT_CODE" >> /tmp/signals.log
