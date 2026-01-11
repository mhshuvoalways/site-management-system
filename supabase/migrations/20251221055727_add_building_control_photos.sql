/*
  # Add Photo Support for Building Control Reports

  1. New Tables
    - `building_control_photos`
      - `id` (uuid, primary key)
      - `building_control_id` (uuid, foreign key to building_control)
      - `photo_url` (text) - URL to the stored image
      - `notes` (text) - Optional notes for the photo
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to profiles)
      
  2. Storage
    - Create storage bucket `building-control-photos` for storing images
    - Enable public access for viewing photos
    - Set up RLS policies for storage bucket
    
  3. Security
    - Enable RLS on `building_control_photos` table
    - Authenticated users can upload and manage photos for their reports
    - Everyone can view photos
*/

-- Create building_control_photos table
CREATE TABLE IF NOT EXISTS building_control_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_control_id uuid REFERENCES building_control(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
);

-- Enable RLS
ALTER TABLE building_control_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for building_control_photos
CREATE POLICY "Authenticated users can view building control photos"
  ON building_control_photos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert building control photos"
  ON building_control_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own building control photos"
  ON building_control_photos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create storage bucket for building control photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('building-control-photos', 'building-control-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Allow authenticated users to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload building control photos'
  ) THEN
    CREATE POLICY "Authenticated users can upload building control photos"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'building-control-photos');
  END IF;
END $$;

-- Allow authenticated users to update their uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update building control photos'
  ) THEN
    CREATE POLICY "Authenticated users can update building control photos"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'building-control-photos');
  END IF;
END $$;

-- Allow authenticated users to delete building control photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete building control photos'
  ) THEN
    CREATE POLICY "Authenticated users can delete building control photos"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'building-control-photos');
  END IF;
END $$;

-- Allow everyone to view building control photos (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view building control photos'
  ) THEN
    CREATE POLICY "Anyone can view building control photos"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'building-control-photos');
  END IF;
END $$;
