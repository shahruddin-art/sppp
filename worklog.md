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

---
Task ID: 2
Agent: Main
Task: Fix "UNABLE TO PUBLISH APP" - dev server was not running

Work Log:
- User reported "UNABLE TO PUBLISH APP" - the dev server had crashed again
- Verified server was not responding (curl returned 000)
- No running node/next processes found
- Killed any stale processes and cleaned .next cache
- Restarted dev server using .zscripts/dev.sh daemonization script
- Waited for server to become ready on localhost:3000
- Health check passed: HTTP 200
- Verified login API works: admin/admin123 returns valid JWT token
- Verified page renders: "Sistem Pengurusan Prestasi Proses Permohonan" + "Memuatkan sistem..."
- Verified all code is intact: businessType field exists in kaunter-dashboard.tsx (lines 106, 124-131, 289-316)
- Verified BUSINESS_TYPES constant is properly defined in constants.ts
- Verified API route handles businessType correctly (route.ts lines 101, 109-111, 138)
- Verified application-detail.tsx displays businessType (lines 76, 231-236)

Stage Summary:
- Dev server restarted and running as daemon on port 3000
- All features intact: businessType field in Kaunter form, API handling, detail view
- App is accessible at localhost:3000 with HTTP 200

---
Task ID: 3
Agent: Main
Task: Add Admin CRUD for applications (Permohonan tab) with table and pagination

Work Log:
- Added PUT and DELETE API endpoints to /api/applications/[id]/route.ts
  - PUT: Admin-only update of application fields (applicantName, applicantIc, applicationType, businessType, zone, status, fileNumber, plbDecision, etc.)
  - DELETE: Admin-only delete with cascade (deletes workflow steps too)
  - Both check role === 'ADMIN' and return 403 for non-admin users
- Added new "Permohonan" tab as the first tab in admin-dashboard.tsx
  - Full CRUD table with columns: No. Rujukan, Nama Pemohon, No. IC/ROC, Jenis, Zon, No. Fail, Status, Dicipta, Tindakan
  - Filters: search (name/ref/file/IC), status, application type, zone
  - Pagination: 10 items per page with shadcn Pagination component (page numbers, prev/next, ellipsis)
  - Create dialog: same fields as Kaunter form (applicant info, application type, businessType for PERMOHONAN_BARU, zone)
  - Edit dialog: all fields + admin-only fields (fileNumber, status, plbDecision, plbDecisionNotes)
  - View dialog: read-only detail popup with staff assignments
  - Delete confirmation: AlertDialog with warning
- Moved tab order: Permohonan first, then Pengguna, Konfigurasi, KPI, Laporan
- Tested all API endpoints: GET (200), PUT (200), DELETE (404 for non-existent, 403 for non-admin)
- Lint passes with no errors

Stage Summary:
- Admin now has full CRUD for applications with table view and pagination
- API endpoints secured: PUT/DELETE restricted to ADMIN role
- Tab "Permohonan" is the default first tab for Admin users

---
Task ID: 4
Agent: Main
Task: Add document checklist during file opening process with print functionality

Work Log:
- Read uploaded PDF (2174_001.pdf) - it was image-based (scanned), so used VLM to extract content
- Identified checklist format from PDF: 10 items with circled numbers, file number header, reference section, company info, signature block
- Added DOCUMENT_CHECKLIST constant to constants.ts with checklist items per application type (PERMOHONAN_BARU: 10 items, TUKAR_NAMA_SYARIKAT: 7 items, TAMBAH_KURANG_PREMIS: 10 items, TAMBAH_TUKAR_AKTIVITI: 8 items, PINDAH_MILIK_LESEN: 8 items)
- Created DocumentChecklist component (src/components/app/document-checklist.tsx) with:
  - Circled numbers (①②③...⑮) instead of checkbox squares
  - Application info summary (Bil., aktiviti, Nama Syarikat, alamat)
  - "Cetak Checklist" button that opens a print-formatted window
  - Print format: A4 page, file number at top center (18pt bold Arial), all other text Arial 12pt, circled numbers, no checkboxes, fits on one page
  - Signature block with PT staff name, "Pembantu Tadbir", "Jabatan Pelesenan", "Majlis Bandaraya Ipoh", date
- Integrated DocumentChecklist into application-detail.tsx:
  - Added as a standalone card in left column, always visible for PT and ADMIN roles
  - Removed duplicate toggle approach from action panel to avoid showing checklist twice
- Cleaned up unused imports (FileCheck, Printer, DOCUMENT_CHECKLIST from application-detail.tsx; useRef, formatDate from document-checklist.tsx)
- Lint passes clean, dev server running without errors, app returns HTTP 200

Stage Summary:
- Document checklist is available in the application detail view for PT and ADMIN users
- Checklist items vary by application type based on official PDF format
- Print button generates a one-page A4 document matching the official checklist format
- File number printed at top center in 18pt bold Arial
- All other text in Arial 12pt with circled numbers (no checkbox squares)
