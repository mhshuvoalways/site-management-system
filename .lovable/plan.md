

# Plan: Rename "Add Equipment" and Show Available Quantity in Dropdown

## Changes

### 1. Rename button and modal title
- **Both files**: `src/pages/admin/SiteDetail.tsx` and `src/pages/site-manager/SiteDetail.tsx`
- Button text: "Add Equipment" → "Register New Equipment"
- Modal title: "Add Equipment to Site" → "Register New Equipment to Site"
- Material button and modal title stay as-is ("Add Material" / "Add Material to Site")

### 2. Show available quantity per equipment item in the dropdown list
In the add modal's dropdown (where items are listed after clicking "Select Equipment"), each **equipment** item will show `Available: {item.quantity}` below the item type label. This uses the `quantity` field from the `items` table (Product Database).

For **materials**, no quantity is shown (current behavior is already correct).

### Technical Details

**Files to edit**: `src/pages/admin/SiteDetail.tsx`, `src/pages/site-manager/SiteDetail.tsx`

**Button rename** (both files):
- Change `<span>Add Equipment</span>` to `<span>Register New Equipment</span>`

**Modal title** (both files):
- Change the conditional text from `Add {addItemType === "equipment" ? "Equipment" : "Material"} to Site` to `{addItemType === "equipment" ? "Register New Equipment" : "Add Material"} to Site`

**Dropdown item rendering** (both files):
- In the `filteredItems.map()` block inside the dropdown, add a line showing `Available: {item.quantity}` only when `addItemType === "equipment"`. This goes below the existing `capitalizeWords(item.item_type)` text.

