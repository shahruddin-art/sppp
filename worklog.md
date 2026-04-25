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
