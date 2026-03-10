

# Trash / Undo Feature

## Overview
When you delete a site, item, or user, it will not be permanently removed right away. Instead, it will be moved to a "Trash" where you can review, restore, or permanently delete it.

## How It Works

1. **Soft Delete** -- Instead of removing records from the database, a `deleted_at` timestamp is added. When this field has a value, the record is considered "trashed."

2. **Existing pages stay clean** -- All current pages (Sites, Storage, Users) will automatically hide trashed records by filtering out anything with a `deleted_at` value.

3. **New Trash page** -- A dedicated Trash page (admin only) where you can:
   - See all trashed Sites, Items, and Users in categorized tabs
   - Restore individual items (sets `deleted_at` back to null)
   - Permanently delete individual items
   - "Empty Trash" to permanently delete everything at once

4. **Users are special** -- When you "trash" a user, only the profile is soft-deleted (the auth account stays intact so it can be restored). Permanent deletion will call the existing `delete-user` edge function to remove the auth account.

## Technical Details

### Database Changes
Add a nullable `deleted_at` (timestamptz) column to three tables:
- `sites`
- `items`
- `profiles`

### Files to Create
- **`src/pages/admin/Trash.tsx`** -- Trash management page with tabs for Sites, Items, and Users. Includes restore, permanent delete, and empty trash functionality.

### Files to Modify
- **`src/App.tsx`** -- Add route `/admin/trash`
- **`src/components/Layout.tsx`** -- Add "Trash" nav link for admin
- **`src/pages/admin/Sites.tsx`** -- Change delete to soft delete (set `deleted_at = now()`) and filter out trashed sites in the query
- **`src/pages/admin/Storage.tsx`** -- Change delete to soft delete and filter out trashed items in queries
- **`src/pages/admin/UserManagement.tsx`** -- Change delete to soft delete (update profile's `deleted_at` instead of calling `delete-user` edge function) and filter out trashed users
- **`src/pages/admin/Dashboard.tsx`** -- Add Trash quick action link
- **`src/pages/site-manager/SitesList.tsx`** -- Filter out trashed sites (already handled by RLS/query, but ensure `deleted_at IS NULL` filter is applied)

### Query Changes
All existing queries that fetch sites, items, or profiles will add `.is('deleted_at', null)` to exclude trashed records.

### Trash Page Features
- Three tabs: Sites, Items, Users
- Each trashed record shows its name, when it was deleted, and Restore / Delete Forever buttons
- "Empty All Trash" button with confirmation dialog
- Trash count badge in the navigation

