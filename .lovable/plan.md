## Problem

The `type="number"` inputs with `max={availableStock}` and `Math.min()` clamping in the `onChange` handler cause mobile browsers to force the value to the maximum quantity. This affects quantity fields in:

- `src/pages/admin/SiteDetail.tsx` — add item, transfer, and reduce modals
- `src/pages/site-manager/SiteDetail.tsx` — same modals

## Fix

1. **Change inputs from `type="number"` to `type="text"` with `inputMode="numeric"` and `pattern="[0-9]*"**` — this gives a numeric keyboard on mobile without the browser enforcing `max` via native controls.
2. **Remove the `max` attribute** from these inputs entirely.
3. **Keep the `Math.min()` clamping but move it to form submission** instead of `onChange`. During typing, allow any numeric value. Validate and clamp only when the form is submitted.
4. **Show a validation message** if the entered quantity exceeds available stock (e.g., red text below the input saying "Cannot exceed available stock of X") instead of silently clamping.

### Files to modify:

- `src/pages/admin/SiteDetail.tsx` — 3 quantity inputs (add, transfer, reduce modals)
- `src/pages/site-manager/SiteDetail.tsx` — 3 quantity inputs (same modals)

### onChange handler change (example):

```tsx
// Before
onChange={(e) => {
  const numValue = parseInt(e.target.value, 10) || 0;
  setQuantity(Math.min(numValue, availableStock));
}}

// After
onChange={(e) => {
  const val = e.target.value.replace(/[^0-9]/g, '');
  setQuantity(val === '' ? 0 : parseInt(val, 10));
}}
```

### Form submit validation:

Clamp or reject at submission time with an alert if quantity > max allowed.