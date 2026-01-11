/*
  # Add Site Manager Worker Assignment Policies

  1. Changes
    - Add INSERT policy for site managers to assign workers to their sites
    - Add UPDATE policy for site managers to update worker assignments in their sites
    - Add DELETE policy for site managers to remove worker assignments from their sites
    
  2. Security
    - Site managers can only manage worker assignments for sites they are assigned to
    - Ensures site managers cannot assign workers to sites they don't manage
*/

-- Allow site managers to insert worker assignments for their sites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'worker_assignments' 
    AND policyname = 'Site managers can assign workers to their sites'
  ) THEN
    CREATE POLICY "Site managers can assign workers to their sites"
      ON worker_assignments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM site_managers sm
          WHERE sm.manager_id = auth.uid()
          AND sm.site_id = worker_assignments.site_id
        )
      );
  END IF;
END $$;

-- Allow site managers to update worker assignments for their sites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'worker_assignments' 
    AND policyname = 'Site managers can update their site worker assignments'
  ) THEN
    CREATE POLICY "Site managers can update their site worker assignments"
      ON worker_assignments
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM site_managers sm
          WHERE sm.manager_id = auth.uid()
          AND sm.site_id = worker_assignments.site_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM site_managers sm
          WHERE sm.manager_id = auth.uid()
          AND sm.site_id = worker_assignments.site_id
        )
      );
  END IF;
END $$;

-- Allow site managers to delete worker assignments for their sites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'worker_assignments' 
    AND policyname = 'Site managers can remove workers from their sites'
  ) THEN
    CREATE POLICY "Site managers can remove workers from their sites"
      ON worker_assignments
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM site_managers sm
          WHERE sm.manager_id = auth.uid()
          AND sm.site_id = worker_assignments.site_id
        )
      );
  END IF;
END $$;
