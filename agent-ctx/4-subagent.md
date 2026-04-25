# Task 4 - Add Tabs to PPL Dashboard

## Summary
Updated `src/components/roles/ppl-dashboard.tsx` to add a Tabs component with two tabs: "Ulasan PPL" and "Senarai Permohonan".

## Changes Made
1. **Imports added**:
   - `Tabs, TabsContent, TabsList, TabsTrigger` from `@/components/ui/tabs`
   - `SenaraiPermohonan` (default import) from `@/components/app/senarai-permohonan`
   - `ClipboardList` icon from `lucide-react`

2. **Layout structure**:
   - Header card and stats summary remain OUTSIDE the tabs (always visible)
   - "Fail Menunggu Ulasan" section wrapped inside `<TabsContent value="ulasan">`
   - `<SenaraiPermohonan onSelectApp={onSelectApp} />` placed inside `<TabsContent value="senarai">`

3. **Tab triggers**:
   - "Ulasan" tab with `MessageSquare` icon
   - "Senarai Permohonan" tab with `ClipboardList` icon

4. **All existing functionality preserved** — state management, filtering, action handling unchanged

## Verification
- Lint check passed
- Dev server running correctly
