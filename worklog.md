---
Task ID: 1-11
Agent: Main Agent
Task: Implement complete RBAC system for Sistem Pengurusan Prestasi Proses Permohonan

Work Log:
- Fixed PO→PLB rename (already complete from previous session)
- Updated Prisma schema: replaced Staff model with User model (with username/password auth), added KpiConfig model
- Pushed schema to database with prisma db push
- Created auth library (src/lib/auth.ts) with SHA-256 password hashing and HMAC-signed JWT session tokens
- Created auth API routes: /api/auth/login, /api/auth/session, /api/auth/logout
- Created admin API routes: /api/admin/users, /api/admin/users/[id], /api/admin/kpi
- Updated seed data with 16 users (all roles with demo passwords) and 12 sample applications
- Created auth store (src/lib/auth-store.ts) using Zustand for client-side auth state
- Created login component (src/components/auth/login-form.tsx) with demo credentials display
- Created Admin Dashboard (src/components/roles/admin-dashboard.tsx) with 4 tabs: Pengguna, Konfigurasi, KPI, Laporan
- Created Kaunter Dashboard (src/components/roles/kaunter-dashboard.tsx) with registration form and application list
- Created PT Dashboard (src/components/roles/pt-dashboard.tsx) with file opening and registration actions
- Created PPKP Dashboard (src/components/roles/ppkp-dashboard.tsx) with processing completion action
- Created PPL Dashboard (src/components/roles/ppl-dashboard.tsx) with ulasan review action
- Created PLB Dashboard (src/components/roles/plb-dashboard.tsx) with decision making action
- Updated main page.tsx with role-based routing, login flow, and user menu dropdown
- Updated all existing API routes to use User model instead of Staff model
- Verified: lint passes, all APIs work, page loads, login works for all roles

Stage Summary:
- Complete RBAC system with 6 roles: ADMIN, KAUNTER, PT, PPKP_L/P, PPL_L/P, PLB
- Each role has its own dashboard with role-appropriate actions
- JWT-based session auth with httpOnly cookies
- Admin can manage users, configure KPI/SLA parameters, and view performance reports
- All text in Bahasa Malaysia
- Demo credentials provided on login page
---
Task ID: 1
Agent: Main Agent
Task: Fix RBAC for Kaunter user - prevent cross-role activity insertion

Work Log:
- Explored entire codebase to identify RBAC gaps in the Process Performance Management System
- Found that ALL core API routes had no authentication/authorization checks
- Only /api/admin/* routes had role checks (ADMIN only)
- POST /api/applications had no auth - anyone could create applications
- POST /api/applications/[id]/action had no role check - any user could perform any workflow action
- GET /api/applications, /api/dashboard, /api/performance, /api/staff, /api/seed had no auth checks
- Created centralized RBAC utility at src/lib/rbac.ts with:
  - Role-action mapping (which roles can perform which workflow actions)
  - Action-status validation (OPEN_FILE requires PENDING_PT status, etc.)
  - Zone validation for PT users
  - Auth helpers (requireAuth, requireRole, canPerformAction, etc.)
- Fixed POST /api/applications:
  - Now requires KAUNTER role to create applications
  - Uses actual logged-in user for KAUNTER_RECEIPT step (instead of finding first KAUNTER)
  - Records the actual user's name in comments
- Fixed POST /api/applications/[id]/action:
  - Verifies user's role matches the action (PT→OPEN_FILE/REGISTER_FILE, PPKP→PPKP_COMPLETE, etc.)
  - Validates application status matches the action
  - Checks zone restrictions for PT users
  - Checks staff assignment for PPKP/PPL/PLB actions
  - Records actual user's name in action comments
- Added session checks to all other API routes:
  - GET /api/applications - requires auth, filters by zone for PT
  - GET /api/applications/[id] - requires auth
  - GET /api/dashboard - requires auth
  - GET /api/performance - requires auth, limited to ADMIN/PLB/PPL roles
  - GET /api/staff - requires auth
  - POST /api/seed - requires ADMIN role
- Fixed ApplicationDetail component:
  - Now receives user prop and conditionally shows action buttons based on role
  - Shows "no permission" notice when user views application but can't act on it
  - PT zone mismatch shows warning instead of action button
- Improved use-fetch hook:
  - Handles 401 (session expired) by automatically clearing user session
  - Better error messages for unauthorized access
- Enforced PT zone filtering server-side in GET /api/applications

Stage Summary:
- RBAC is now properly enforced at the API level
- Kaunter users can ONLY create applications (their designated role)
- Kaunter users can NO LONGER perform workflow actions for other roles
- Each workflow action is restricted to the appropriate role
- PT users can only process applications in their assigned zone
- Session authentication is required for all API endpoints
- Frontend also hides action buttons for unauthorized users (defense-in-depth)
