#!/bin/bash
# Double-fork daemonization technique
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=256"

# First fork
(
  # Second fork - this ensures the process is reparented to init
  node node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0 >> /home/z/my-project/.zscripts/server.log 2>&1 &
  echo "Daemon started with PID $!"

  # Exit the intermediate process
  exit 0
) &

# Wait for the intermediate process
wait
