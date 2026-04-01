

# Add Editable Report Title + Make Notes Optional

## What Bim wants

Right now, every report card displays the hardcoded title **"Site Photos Entry"** and requires notes to be filled in. Bim wants:

1. A **"Report Title"** field added to the create and edit modals (above the notes field)
2. Users can write custom titles like "Week 2", "Foundation Inspection", etc.
3. The title appears on the report card instead of the hardcoded "Site Photos Entry"
4. **Notes become optional** -- not required to create a report

## Database change

Add a `title` column to the `building_control` table:
- Column: `title` (text, nullable, default `'Site Photos Entry'`)
- Nullable + default ensures all existing reports keep showing "Site Photos Entry" without breaking anything

## Code changes

### Both `src/pages/admin/BuildingControl.tsx` and `src/pages/site-manager/BuildingControl.tsx`:

1. **New Report modal**: Add a "Report Title" text input above "Report Notes". Default placeholder: "e.g. Week 2, Foundation Check...". Pre-fill with "Site Photos Entry". Remove `required` from the notes textarea.

2. **Edit Report modal**: Add "Report Title" text input (pre-filled with current title). Keep notes optional.

3. **Report card display**: Replace hardcoded `"Site Photos Entry"` with `report.title || 'Site Photos Entry'` (fallback for old reports without a title).

4. **State updates**: Change `newReport` state from `{ notes: "" }` to `{ title: "Site Photos Entry", notes: "" }`. Add `editTitle` state alongside existing `editNotes`.

5. **Insert/Update queries**: Include `title` field in the Supabase insert and update calls.

### `src/types/index.ts`:
- Add `title?: string` to the `BuildingControl` interface.

## Implementation order
1. Database migration (add `title` column)
2. Update both BuildingControl page files (admin + site-manager)
3. Update TypeScript types

