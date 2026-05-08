#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=256"
export PORT=3000
export HOSTNAME=0.0.0.0

while true; do
  echo "[$(date)] Starting Next.js production server..." >> /home/z/my-project/.zscripts/server.log
  node node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0 >> /home/z/my-project/.zscripts/server.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> /home/z/my-project/.zscripts/server.log
  sleep 3
done
