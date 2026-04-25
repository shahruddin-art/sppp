# Task 9b: PT Dashboard Component

## Summary
Created the PT (Pembantu Tadbir) dashboard component at `src/components/roles/pt-dashboard.tsx`.

## Component Details

### Interface
```typescript
interface PTDashboardProps {
  user: {
    id: string;
    username: string;
    role: string;
    name: string;
    zone: string | null;
  };
  onSelectApp: (appId: string) => void;
}
```

### Three Sections
1. **Permohonan Menunggu** (Pending - PENDING_PT status)
   - Cards with applicant name, reference no, type, zone, SLA countdown
   - PPKP routing info (PPKP(L) or PPKP(P) based on application type)
   - "Buka Fail" button → Dialog with comment textarea → POST OPEN_FILE action
   - Overdue cards highlighted with red border/background

2. **Permohonan Aktif** (In Progress - PT_PROCESSING status)
   - Cards with file opening info, registration status
   - "Daftar No. Fail" button → Dialog with file number input → POST REGISTER_FILE action
   - Routing info shown (will be sent to PPKP after registration)

3. **Baru Selesai** (Recently Completed)
   - Compact list view with SLA compliance badges (Tepat Masa / Lewat)
   - File numbers and reference numbers displayed
   - Clickable cards navigate to detail view

### Key Features
- Zone filtering based on user.zone
- SLA countdown with color coding (green/amber/red)
- Urgency-based sorting (overdue first)
- Auto-refresh via useFetch (30s interval)
- Loading skeletons and empty states
- All text in Bahasa Malaysia
- Responsive grid layout (1-col mobile, 2-col desktop)

### API Integration
- GET `/api/applications?zone={zone}` — Fetch zone-filtered applications
- POST `/api/applications/[id]/action` — OPEN_FILE and REGISTER_FILE actions

### Dependencies
- shadcn/ui: Card, Badge, Button, Dialog, Input, Textarea, Label, Separator, ScrollArea
- lucide-react icons
- useFetch, postData from @/hooks/use-fetch
- Formatters and constants from @/lib/
- toast from sonner

## Status: Complete ✅
## Lint: Passed ✅
