

# Plan: Inventory UX Improvements

## Summary of Changes

After reviewing the code, here is what each request means for our app and what we will implement:

---

### 1. Remove quantity for materials

**Current behavior**: Materials on site detail pages show "Qty: 5" and have transfer/reduce quantity actions.

**Change**: Materials become simple list items -- no quantity display, no quantity input when adding materials to a site. When adding a material, it gets added with quantity 1 (or incremented by 1) automatically. Remove the "Reduce" button for materials. Keep transfer and delete.

**Files**: `src/pages/admin/SiteDetail.tsx`, `src/pages/site-manager/SiteDetail.tsx`

In the **Product Database** (Storage page), also hide the quantity column/input for materials since they are just logged, not counted.

**Files**: `src/pages/admin/Storage.tsx`

---

### 2. Remove "Out of stock" restriction for equipment

**Current behavior**: Items with 0 available stock are disabled in the dropdown and labeled "(Out of stock)". The submit button is disabled when available stock is 0.

**Change**: Remove the `disabled` attribute and "Out of stock" restriction from the item dropdown. Allow selecting any item regardless of stock level. Allow quantity 0 for equipment. This means the "available stock" concept from the master Product Database no longer blocks adding items to sites.

**Files**: `src/pages/admin/SiteDetail.tsx`, `src/pages/site-manager/SiteDetail.tsx`

---

### 3. Separate "Add Equipment" and "Add Material" buttons

**Current behavior**: One "+ Add Item" button opens a modal where the user searches all items.

**Change**: Replace with two buttons: "+ Add Equipment" and "+ Add Material". Each opens the same add modal but pre-filtered to that item type. For materials, the modal skips the quantity input entirely (auto-adds with quantity 1).

**Files**: `src/pages/admin/SiteDetail.tsx`, `src/pages/site-manager/SiteDetail.tsx`

---

### 4 & 5. Multi-select with checkboxes for bulk delete/transfer

**Current behavior**: Items are deleted one at a time via individual action buttons.

**Change**: Add a checkbox to each item row in the equipment and materials lists. When one or more items are selected, show a floating action bar with "Delete Selected" and "Transfer Selected" buttons. This applies to site detail pages (both admin and site-manager).

For the Product Database (Storage page), add checkboxes for bulk delete as well.

**Files**: `src/pages/admin/SiteDetail.tsx`, `src/pages/site-manager/SiteDetail.tsx`, `src/pages/admin/Storage.tsx`

**Note**: The client mentioned checkboxes on photos and building control too, but those have different data structures. We will implement it for equipment/materials first and can extend later.

---

## Technical Approach

No database changes needed. All changes are UI-only.

### State additions per SiteDetail page:
- `addItemType: 'equipment' | 'material'` -- tracks which button was clicked
- `selectedEquipmentIds: Set<string>` -- tracks checked equipment items
- `selectedMaterialIds: Set<string>` -- tracks checked material items

### Key logic changes:
- Add modal: filter `filteredItems` by `addItemType`; if `addItemType === 'material'`, hide quantity input and submit with quantity = 1
- Item dropdown: remove `disabled={itemAvailableStock === 0}` and the "Out of stock" styling
- Equipment list rows: add checkbox, show "Qty: X" as before
- Material list rows: add checkbox, hide "Qty: X", hide "Reduce" button
- When items are selected: show bulk action bar with Delete Selected / Transfer Selected
- Bulk delete: loop through selected IDs and soft-delete each
- Bulk transfer: open transfer modal for all selected items (transfer same quantity to same site)

