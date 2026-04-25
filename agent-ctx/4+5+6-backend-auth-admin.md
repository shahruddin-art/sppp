# Task 4+5+6 - Backend Auth & Admin Agent

## Summary
Built complete auth system, admin API routes, and migrated from Staff to User model.

## Files Created
- `src/lib/auth.ts` - Auth library with password hashing, session token creation/verification
- `src/app/api/auth/login/route.ts` - POST login endpoint
- `src/app/api/auth/session/route.ts` - GET session endpoint
- `src/app/api/auth/logout/route.ts` - POST logout endpoint
- `src/app/api/admin/users/route.ts` - GET/POST admin users
- `src/app/api/admin/users/[id]/route.ts` - GET/PUT/DELETE admin user by ID
- `src/app/api/admin/kpi/route.ts` - GET/POST admin KPI configs

## Files Modified
- `src/app/api/seed/route.ts` - Migrated to User model with passwords and KPI configs
- `src/app/api/staff/route.ts` - Changed db.staff to db.user
- `src/app/api/applications/route.ts` - Changed db.staff.findFirst to db.user.findFirst

## Test Results
All endpoints verified working:
- Login with session cookie: ✅
- Session check: ✅
- Admin users list (16 users): ✅
- Admin KPI configs (3 configs): ✅
- Staff endpoint (16 staff, User model): ✅
- Applications endpoint (12 apps): ✅
- Dashboard endpoint: ✅
- Performance endpoint: ✅
- Admin auth protection (rejected without cookie): ✅
- Logout: ✅
- Single user GET: ✅
- User update (PUT): ✅
- User create (POST): ✅
- User deactivate (DELETE): ✅
- Lint: ✅
