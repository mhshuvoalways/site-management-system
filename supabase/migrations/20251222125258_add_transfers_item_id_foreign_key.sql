/*
  # Add missing foreign key for transfers.item_id

  1. Changes
    - Add foreign key constraint for transfers.item_id referencing items(id)
  
  2. Notes
    - This foreign key was missing from the original migration
    - Required for Supabase/PostgREST relationship queries to work properly
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transfers_item_id_fkey'
  ) THEN
    ALTER TABLE transfers 
    ADD CONSTRAINT transfers_item_id_fkey 
    FOREIGN KEY (item_id) 
    REFERENCES items(id) 
    ON DELETE CASCADE;
  END IF;
END $$;
