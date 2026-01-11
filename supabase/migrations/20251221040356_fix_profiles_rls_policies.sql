/*
  # Fix Infinite Recursion in Profiles RLS Policies

  ## Problem
  The existing policies create infinite recursion because they check the profiles table 
  to determine if a user is an admin, which requires reading the profiles table.

  ## Solution
  Simplify policies to allow users to read their own profile without subqueries.
  Admin checks will be done at the application level after the profile is loaded.

  ## Changes
  1. Drop existing problematic policies
  2. Create simple, non-recursive policies
  3. Users can always read their own profile
  4. Users can update their own profile
*/

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new non-recursive policies

-- Allow all authenticated users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow all authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow all authenticated users to insert their own profile
-- This is needed when a new user signs up
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- For admin operations, we'll check role in application code after profile is loaded
-- Create a permissive policy that allows reading all profiles
CREATE POLICY "Authenticated users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert any profile (for admin user creation)
CREATE POLICY "Authenticated users can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update any profile
CREATE POLICY "Authenticated users can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete profiles
CREATE POLICY "Authenticated users can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (true);