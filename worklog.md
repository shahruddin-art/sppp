---
Task ID: 1
Agent: Main Agent
Task: Debug and fix application creation failure when daftar permohonan

Work Log:
- Checked dev server status - server was down, restarted using .zscripts/dev.sh
- Tested API directly with curl - POST /api/applications returned 201 (success)
- Investigated session/auth flow - found user passwords (admin/admin123, ezad/ezad123, fadhil/fadhil123)
- Identified root cause: ADMIN role was not in CAN_CREATE_APPLICATION list, causing 403 error when Admin dashboard tried to create applications
- Fixed rbac.ts: Added 'ADMIN' to CAN_CREATE_APPLICATION role list
- Improved API error messages: Changed "Missing required fields" to specific Malay field names
- Improved API error messages: Changed "Failed to create application" to include actual error details
- Updated application creation comment to include user role in KAUNTER_RECEIPT step
- Improved frontend error handling in kaunter-dashboard.tsx: Added console.error, better session expiry detection, longer toast duration
- Verified both KAUNTER and ADMIN can create applications successfully
- Tested full PT workflow (open file → register file number) - works correctly

Stage Summary:
- Application creation now works for both KAUNTER and ADMIN roles
- Better error messages in Malay for API validation errors
- Improved frontend error handling with session expiry detection
- All lint checks pass
