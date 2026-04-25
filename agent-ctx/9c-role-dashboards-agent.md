# Task 9c - Role Dashboard Components (PPKP, PPL, PLB)

## Work Summary
Created three role dashboard components for the Sistem Pengurusan Prestasi Proses Permohonan.

## Files Created
1. `src/components/roles/ppkp-dashboard.tsx` - PPKP Dashboard
2. `src/components/roles/ppl-dashboard.tsx` - PPL Dashboard
3. `src/components/roles/plb-dashboard.tsx` - PLB Dashboard

## Component Details

### PPKP Dashboard
- Shows PPKP(L) or PPKP(P) variant based on user.role
- Displays assignment type (G1/G1-P/G7/G8/G9/G11/Papan Iklan for L; G2/G3/Permit Sementara for P)
- Filters applications by `status === 'PPKP_PROCESSING'` and `ppkpStaff.role === user.role`
- Each card shows: applicant name, reference, type, zone, file number, SLA countdown (4 days)
- SLA countdown with color coding: green (plenty of time), amber (warning ≤1 day), red (overdue)
- Comment textarea + "Selesai Pemprosesan & Hantar ke PPL" button
- API: POST /api/applications/[id]/action with {action: 'PPKP_COMPLETE', comments}
- Stats summary: Menunggu Pemprosesan, Lewat SLA, Amaran SLA
- Auto-refresh via useFetch with 15s interval

### PPL Dashboard
- Shows PPL(L) or PPL(P) variant based on user.role
- Displays which PPKP variant they receive files from
- Filters applications by `status === 'PPL_REVIEW'` and `pplStaff.role === user.role`
- Each card shows: applicant name, reference, type, zone, file number, PPKP comments, SLA countdown (3 days)
- SLA countdown with color coding (same pattern as PPKP)
- Ulasan textarea (required) + "Hantar Ulasan ke PLB" button (disabled until ulasan entered)
- API: POST /api/applications/[id]/action with {action: 'PPL_REVIEW_COMPLETE', comments}
- Stats summary: Menunggu Ulasan, Lewat SLA, Amaran SLA
- Auto-refresh via useFetch with 15s interval

### PLB Dashboard
- Shows "Pegawai Lesen Bandar" header
- Two sections:
  1. "Fail Menunggu Keputusan" - applications with status === 'PLB_DECISION'
     - Each card shows: applicant name, reference, type, zone, file number, PPKP comments, PPL ulasan
     - Decision dropdown: Simpan Fail / Hantar ke Jabatan Kesihatan / Hantar ke Jabatan Perancang Bandar
     - Notes textarea + "Sahkan Keputusan" button (disabled until decision selected)
     - API: POST /api/applications/[id]/action with {action: 'PLB_DECIDE', plbDecision, plbDecisionNotes}
  2. "Keputusan Terkini" - recently completed applications with their decisions
     - Compact list with decision badges (color-coded by type)
     - Shows applicant name, reference, file number, decision notes, timestamp
- Stats summary: Menunggu Keputusan, Selesai, Hantar ke J. Kesihatan, Hantar ke J. Perancang
- Auto-refresh via useFetch with 15s interval

## Common Features
- All text in Bahasa Malaysia
- Responsive design (mobile-first, grid 1-col mobile → 2-col desktop)
- SLA countdown with color coding (green/amber/red)
- Loading states with skeleton cards
- Empty states with informative messages
- Error states with retry buttons
- Click on card header/tags navigates via onSelectApp
- Action areas use stopPropagation to prevent navigation on interaction
- Uses shadcn/ui components (Card, Button, Badge, Textarea, Label, Select, Separator, ScrollArea)
- Uses lucide-react icons
- Uses useFetch with refreshInterval: 15000
- Uses postData for API actions
- Uses toast from sonner for success/error notifications
- Uses formatters and constants from @/lib

## Lint Status
✅ All passed with no errors
