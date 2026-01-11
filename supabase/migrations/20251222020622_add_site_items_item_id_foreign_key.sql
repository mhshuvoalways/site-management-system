/*
  # Add Missing Foreign Key Constraint

  ## Changes
  This migration adds the missing foreign key constraint for the item_id column
  in the site_items table. This constraint is required for Supabase's embedded
  relationship queries to work properly.

  ## Tables Modified
  - site_items: Add foreign key constraint for item_id column

  ## Security
  No changes to RLS policies. This is purely a schema fix.
*/

-- Add the missing foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'site_items_item_id_fkey'
    AND table_name = 'site_items'
  ) THEN
    ALTER TABLE site_items
    ADD CONSTRAINT site_items_item_id_fkey
    FOREIGN KEY (item_id)
    REFERENCES items(id)
    ON DELETE CASCADE;
  END IF;
END $$;
