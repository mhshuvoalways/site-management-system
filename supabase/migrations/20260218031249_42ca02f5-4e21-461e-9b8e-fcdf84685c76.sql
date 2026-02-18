
-- Add soft delete columns to site_items
ALTER TABLE public.site_items 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN deleted_by uuid DEFAULT NULL;
