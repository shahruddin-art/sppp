#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=512"

# Start production server
exec npx next start -p 3000 -H 0.0.0.0
