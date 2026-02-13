
-- Add deleted_at column to sites
ALTER TABLE public.sites ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Add deleted_at column to items
ALTER TABLE public.items ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Add deleted_at column to profiles
ALTER TABLE public.profiles ADD COLUMN deleted_at timestamptz DEFAULT NULL;
