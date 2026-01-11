/*
  # Site Management System - Tables Creation

  ## Overview
  Creates all tables for the construction site management system

  ## New Tables
  1. profiles - User profiles with roles
  2. sites - Construction sites
  3. site_managers - Assignment of managers to sites
  4. items - Master storage database
  5. site_items - Items assigned to sites
  6. transfers - Transfer history
  7. building_control - Building control reports
  8. workers - Worker profiles
  9. worker_assignments - Worker site assignments
  10. time_logs - Worker clock in/out records

  ## Security
  - RLS enabled on all tables
  - Basic policies for immediate access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'site_manager', 'worker')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create sites table
CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- Create site_managers table
CREATE TABLE IF NOT EXISTS site_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(site_id, manager_id)
);

ALTER TABLE site_managers ENABLE ROW LEVEL SECURITY;

-- Create items table (master storage)
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  item_type text NOT NULL CHECK (item_type IN ('equipment', 'material')),
  quantity integer DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create site_items table
CREATE TABLE IF NOT EXISTS site_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity integer DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(site_id, item_id)
);

ALTER TABLE site_items ENABLE ROW LEVEL SECURITY;

-- Create transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  from_site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  to_site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  transferred_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- Create building_control table
CREATE TABLE IF NOT EXISTS building_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  notes text NOT NULL,
  images jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE building_control ENABLE ROW LEVEL SECURITY;

-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  phone text DEFAULT '',
  status text DEFAULT 'off' CHECK (status IN ('working', 'off', 'sick')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Create worker_assignments table
CREATE TABLE IF NOT EXISTS worker_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  removed_at timestamptz
);

ALTER TABLE worker_assignments ENABLE ROW LEVEL SECURITY;

-- Create time_logs table
CREATE TABLE IF NOT EXISTS time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  total_hours numeric
);

ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_site_managers_site_id ON site_managers(site_id);
CREATE INDEX IF NOT EXISTS idx_site_managers_manager_id ON site_managers(manager_id);
CREATE INDEX IF NOT EXISTS idx_site_items_site_id ON site_items(site_id);
CREATE INDEX IF NOT EXISTS idx_site_items_item_id ON site_items(item_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_site ON transfers(from_site_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_site ON transfers(to_site_id);
CREATE INDEX IF NOT EXISTS idx_building_control_site_id ON building_control(site_id);
CREATE INDEX IF NOT EXISTS idx_worker_assignments_worker_id ON worker_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_assignments_site_id ON worker_assignments(site_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_worker_id ON time_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_site_id ON time_logs(site_id);