

# Implementation Plan: 7 Changes from Client Call

## 1. Rename "Building Control" to "Site Photos" everywhere

**Files to change:**
- `src/pages/admin/SiteDetail.tsx` -- Link text "Building Control" → "Site Photos"
- `src/pages/site-manager/SiteDetail.tsx` -- Same rename
- `src/pages/admin/BuildingControl.tsx` -- Page title, report entry labels, modal titles, empty state text, PDF title
- `src/pages/site-manager/BuildingControl.tsx` -- Same renames
- `src/App.tsx` -- Route paths stay as `/building-control` (URL doesn't matter to client), but component names stay the same internally

No database or route URL changes needed -- only visible UI text.

## 2. Make "View Details" button bigger / easier to tap

**Files:** `src/pages/admin/Sites.tsx`, `src/pages/site-manager/SitesList.tsx`

Currently the "View Details →" is a small text link in the card footer. Change the entire footer area into a clickable Link with a larger tap target -- make it a full-width button-style element with padding.

## 3. Reports as editable folders (add/remove photos to existing reports, track last modified)

**Database migration:**
- Add `updated_at` (timestamptz, default now()) column to `building_control` table
- Add `updated_by` (uuid, nullable) column to `building_control` table
- Add UPDATE RLS policy for site managers on `building_control`

**Files:** `src/pages/admin/BuildingControl.tsx`, `src/pages/site-manager/BuildingControl.tsx`

Changes to the Edit modal:
- Currently edit only allows changing notes text. Expand it to a full "Edit Report" view that shows existing photos (with delete buttons) and an "Upload Photos" / "Take Photo" area to add more
- When saving edits, update `updated_at` and `updated_by`

Display changes on report cards:
- Show "Last modified by [name] on [date]" when `updated_at` differs from `created_at`

## 4. "Take Photo" with geolocation

**Database migration** (combined with #3):
- Add `latitude` (double precision, nullable) to `building_control_photos`
- Add `longitude` (double precision, nullable) to `building_control_photos`
- Add `location_address` (text, nullable) to `building_control_photos`
- Add `taken_at` (timestamptz, nullable) to `building_control_photos`

**Files:** `src/pages/admin/BuildingControl.tsx`, `src/pages/site-manager/BuildingControl.tsx`

- Add a "Take Photo" button (camera icon) that uses `<input type="file" accept="image/*" capture="environment">` to open device camera
- On capture, call `navigator.geolocation.getCurrentPosition()` to get lat/lng
- Reverse geocode via OpenStreetMap Nominatim API (free, no key)
- Store location data with the photo record
- Display location badge and timestamp on photo thumbnails
- Include location/time in PDF export

**PhotoUpload interface update:**
```typescript
interface PhotoUpload {
  file: File;
  preview: string;
  notes: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  takenAt?: string;
}
```

## 5. Download as PDF or JPEG/PNG (selectable photos)

**Files:** `src/pages/admin/BuildingControl.tsx`, `src/pages/site-manager/BuildingControl.tsx`

In the bulk action bar, replace the single "Download PDF" button with two options:
- **Download as PDF** -- existing behavior, generates a formatted PDF document
- **Download as Images** -- downloads the selected reports' photos as individual JPEG/PNG files

For single report download button, show a small dropdown with "PDF" and "Images" options.

## 6. Scoped "Empty Trash" -- only empties the active tab

**File:** `src/pages/admin/Trash.tsx`

Change `handleEmptyAll` to only delete items from the currently active tab instead of all tabs. Update the button label from "Empty All Trash" to "Empty [Tab Name] Trash" (e.g., "Empty Site Items Trash"). Update the confirmation dialog message to reflect the scoped deletion.

## 7. All roles can add/delete in Site Photos (not just admins)

**Database migration** (combined with #3 and #4):
- Add UPDATE and DELETE RLS policies for site managers on `building_control`
- Add DELETE policy for site managers on `building_control_photos`
- Add INSERT, SELECT, UPDATE, DELETE policies for workers on `building_control` and `building_control_photos` (scoped to their assigned sites via `worker_assignments`)

No frontend role-gating changes needed since the BuildingControl pages don't currently check roles for UI actions -- the RLS policies are the gatekeepers.

---

## Implementation Order

1. Database migration (columns + RLS policies for changes 3, 4, 7)
2. Rename "Building Control" → "Site Photos" (#1)
3. Bigger "View Details" button (#2)
4. Scoped trash empty (#6)
5. Take Photo with geolocation (#4)
6. Folder-style edit report with add/remove photos + last modified tracking (#3)
7. Download as PDF or Images (#5)

