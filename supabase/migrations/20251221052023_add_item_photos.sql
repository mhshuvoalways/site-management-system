/*
  # Add Photo Support for Items

  1. Changes
    - Add `photo_url` column to `items` table to store image URLs
    
  2. Storage
    - Create storage bucket `item-photos` for storing item images
    - Enable public access for item photos
    - Set up RLS policies for storage bucket
    
  3. Security
    - Authenticated users can upload photos
    - Everyone can view photos (public bucket)
*/

-- Add photo_url column to items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE items ADD COLUMN photo_url text;
  END IF;
END $$;

-- Create storage bucket for item photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-photos', 'item-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Allow authenticated users to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload item photos'
  ) THEN
    CREATE POLICY "Authenticated users can upload item photos"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'item-photos');
  END IF;
END $$;

-- Allow authenticated users to update their uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update item photos'
  ) THEN
    CREATE POLICY "Authenticated users can update item photos"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'item-photos');
  END IF;
END $$;

-- Allow authenticated users to delete item photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete item photos'
  ) THEN
    CREATE POLICY "Authenticated users can delete item photos"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'item-photos');
  END IF;
END $$;

-- Allow everyone to view item photos (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view item photos'
  ) THEN
    CREATE POLICY "Anyone can view item photos"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'item-photos');
  END IF;
END $$;