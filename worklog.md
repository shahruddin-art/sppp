---
Task ID: 1
Agent: Main
Task: Fix dev server crash and Preview Panel access

Work Log:
- Diagnosed that the Next.js dev server kept dying after ~30 seconds
- Tested with production build (next start) - same issue
- Tested with minimal Node.js HTTP server - survived indefinitely
- Discovered the root cause: processes started from bash sessions get killed when the session ends
- The sandbox environment (using tini as PID 1) cleans up orphaned processes from terminated shell sessions
- Solution: Double-fork daemonization technique to make the server process a child of PID 1 (tini)
- Created daemon scripts in .zscripts/ that use double-fork to reparent the server to init
- Updated .zscripts/dev.sh with proper daemonization
- Updated package.json with memory limits (dev: 2048MB, start: 512MB)
- Verified server stability: running for 3+ minutes with continuous HTTP 200 responses
- Verified login API works correctly (admin/admin123)
- Cleared corrupted .next/Turbopack cache

Stage Summary:
- Dev server is now stable and running as daemon (PID 8229, PPid 8216)
- Memory usage: ~939MB for dev mode (Turbopack), ~170MB for production mode
- Login API returns valid JWT tokens
- Server accessible via localhost:3000 with HTTP 200
- Key fix: double-fork daemonization prevents sandbox from killing the server process
