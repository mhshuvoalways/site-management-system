
-- Add foreign key for deleted_by on site_items
ALTER TABLE public.site_items
ADD CONSTRAINT site_items_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id);
