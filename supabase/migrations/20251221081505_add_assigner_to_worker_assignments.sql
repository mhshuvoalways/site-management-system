/*
  # Add Assigner Tracking to Worker Assignments

  ## Overview
  Adds tracking of who assigned workers to sites (admin or site manager)

  ## Changes
  1. Modified Columns
    - Add `assigned_by` column to worker_assignments table
      - Tracks which user (admin or site manager) assigned the worker
      - References profiles(id)
      - Required field for accountability
      - Includes constraint to ensure assigned_by exists

  ## Security
  - No RLS changes needed - existing policies cover this
  - Ensures accountability by tracking who made each assignment

  ## Notes
  - Existing records will need assigned_by to be set
  - Future assignments must include assigned_by
*/

-- Add assigned_by column to worker_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worker_assignments' AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE worker_assignments 
    ADD COLUMN assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;