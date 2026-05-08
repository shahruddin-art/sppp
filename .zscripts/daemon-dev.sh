#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=256"

# Double-fork to daemonize
(
  node node_modules/next/dist/bin/next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/.zscripts/server.log 2>&1 &
  echo "Dev daemon started with PID $!"
  exit 0
) &
wait
