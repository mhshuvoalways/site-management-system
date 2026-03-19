

# Feature 1: Item Request & Approval System

## What it does
Site managers can request increasing an item's quantity in the Product Database (e.g. "We bought 10 more AcroProps"). The admin sees these requests on a dedicated "Requests" page and can approve or decline. On approval, the item's quantity in the Product Database increases.

## Database
New `item_requests` table:
- `id` (uuid, PK)
- `item_id` (uuid, FK to items)
- `requested_by` (uuid, FK to profiles)
- `quantity` (integer) -- how many more to add
- `status` (text: 'pending' / 'approved' / 'declined')
- `reviewed_by` (uuid, nullable)
- `notes` (text, nullable) -- optional reason from site manager
- `created_at`, `reviewed_at` (timestamptz)

RLS: Site managers can insert and view their own requests. Admins can view all and update status.

## New files
- **`src/pages/admin/ItemRequests.tsx`** -- Full page showing all requests (filterable by status). Each row shows item name, requester, quantity, date, and Approve/Decline buttons. On approve, updates `items.quantity` and sets request status.
- Route added at `/admin/requests` in `src/App.tsx`

## Modified files
- **`src/components/Layout.tsx`** -- Add "Requests" nav link for admin (with pending count badge)
- **`src/pages/site-manager/SiteDetail.tsx`** -- Add a "Request More Stock" button (visible for equipment items). Opens a small modal where the site manager enters the quantity and optional note, then inserts into `item_requests`.
- **`src/App.tsx`** -- Add `/admin/requests` route

---

# Feature 2: Equipment History

## What it does
A "History" button on each equipment item (in Product Database and Site Detail pages) opens a modal showing where that item has been over time, using data from the existing `transfers` table. Includes weekly and monthly view toggles.

## No database changes needed
The `transfers` table already records `item_id`, `from_site_id`, `to_site_id`, `quantity`, and `created_at`.

## New files
- **`src/components/EquipmentHistory.tsx`** -- Reusable modal component. Takes an `item_id` and `item_name`. Queries `transfers` filtered by that item, joins site names. Displays a timeline grouped by week or month (toggle). Each entry shows: date, from site, to site, quantity moved.

## Modified files
- **`src/pages/admin/Storage.tsx`** -- Add "History" button on each equipment row (not materials). Clicking opens the EquipmentHistory modal.
- **`src/pages/admin/SiteDetail.tsx`** -- Add "History" button on each equipment item in the site's equipment list.
- **`src/pages/site-manager/SiteDetail.tsx`** -- Same "History" button for site manager view.

---

## Implementation order
1. Create `item_requests` table with RLS
2. Build admin Requests page + route + nav link
3. Add "Request More Stock" flow to site manager SiteDetail
4. Build EquipmentHistory modal component
5. Add History buttons to Storage, admin SiteDetail, and site-manager SiteDetail

