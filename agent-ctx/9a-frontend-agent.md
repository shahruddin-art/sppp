# Task 9a - Kaunter Dashboard Component

## Summary
Created the Kaunter (Counter) role dashboard component at `src/components/roles/kaunter-dashboard.tsx`.

## What was built
- **Two-tab dashboard** for the Kaunter role
  - Tab 1 "Daftar Permohonan": Registration form with applicant info (name, IC, phone, address), application details (type dropdown from APPLICATION_TYPES, zone dropdown from ZONES A-E), automatic routing preview showing the full workflow path, form submission via POST /api/applications, and success message with reference number
  - Tab 2 "Senarai Permohonan": Filterable application list with search, status filter, zone filter, application cards showing badges (status/zone/type), SLA countdown indicators, overdue warnings, and click-to-navigate via `onSelectApp(appId)`

## Key details
- Component interface: `KaunterDashboardProps { user, onSelectApp }`
- All text in Bahasa Malaysia
- Responsive design (mobile-first with sm: breakpoints)
- Loading skeleton cards and empty states
- Uses existing project utilities: `useFetch`, `postData`, `toast`, constants, formatters
- Uses shadcn/ui components: Tabs, Card, Input, Select, Badge, Button, Label, Separator
- Lint: passed with no errors

## Files changed
- Created: `src/components/roles/kaunter-dashboard.tsx`
- Updated: `worklog.md` (appended task log)
