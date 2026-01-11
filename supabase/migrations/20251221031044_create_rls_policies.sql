/*
  # Row Level Security Policies

  ## Overview
  Comprehensive RLS policies for all tables based on three roles:
  - Admin: Full access to everything
  - Site Manager: Access to assigned sites only
  - Worker: Access to own data only

  ## Security Rules
  1. Profiles: Users see own profile, admins see all
  2. Sites: Admins manage all, site managers see assigned, workers see assigned
  3. Items: Admins manage, site managers view
  4. Site Items: Admins manage all, site managers manage assigned sites
  5. Transfers: Admins see all, site managers create from their sites
  6. Building Control: Admins and site managers manage their sites
  7. Workers: Admins manage, workers see own data
  8. Worker Assignments: Admins manage, workers see own
  9. Time Logs: Workers manage own, admins and site managers view
*/

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Sites policies
CREATE POLICY "Admins can manage all sites"
  ON sites FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Site managers can view assigned sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'site_manager'
      AND EXISTS (
        SELECT 1 FROM site_managers sm
        WHERE sm.manager_id = auth.uid()
        AND sm.site_id = sites.id
      )
    )
  );

CREATE POLICY "Workers can view assigned sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'worker'
      AND EXISTS (
        SELECT 1 FROM worker_assignments wa
        WHERE wa.worker_id = auth.uid()
        AND wa.site_id = sites.id
        AND wa.removed_at IS NULL
      )
    )
  );

-- Site managers policies
CREATE POLICY "Admins can manage site managers"
  ON site_managers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Site managers can view their assignments"
  ON site_managers FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

-- Items policies
CREATE POLICY "Admins can manage items"
  ON items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Site managers can view items"
  ON items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'site_manager'
    )
  );

-- Site items policies
CREATE POLICY "Admins can manage all site items"
  ON site_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Site managers can view their site items"
  ON site_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM site_managers sm
      WHERE sm.manager_id = auth.uid()
      AND sm.site_id = site_items.site_id
    )
  );

CREATE POLICY "Site managers can update their site items"
  ON site_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM site_managers sm
      WHERE sm.manager_id = auth.uid()
      AND sm.site_id = site_items.site_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_managers sm
      WHERE sm.manager_id = auth.uid()
      AND sm.site_id = site_items.site_id
    )
  );

CREATE POLICY "Site managers can insert site items"
  ON site_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_managers sm
      WHERE sm.manager_id = auth.uid()
      AND sm.site_id = site_items.site_id
    )
  );

CREATE POLICY "Site managers can delete their site items"
  ON site_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM site_managers sm
      WHERE sm.manager_id = auth.uid()
      AND sm.site_id = site_items.site_id
    )
  );

-- Transfers policies
CREATE POLICY "Admins can view all transfers"
  ON transfers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can create transfers"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Site managers can view their site transfers"
  ON transfers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM site_managers sm
      WHERE sm.manager_id = auth.uid()
      AND (sm.site_id = transfers.from_site_id OR sm.site_id = transfers.to_site_id)
    )
  );

CREATE POLICY "Site managers can create transfers from their sites"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_managers sm
      WHERE sm.manager_id = auth.uid()
      AND sm.site_id = transfers.from_site_id
    )
  );

-- Building control policies
CREATE POLICY "Admins can manage building control"
  ON building_control FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Site managers can view their site building control"
  ON building_control FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM site_managers sm
      WHERE sm.manager_id = auth.uid()
      AND sm.site_id = building_control.site_id
    )
  );

CREATE POLICY "Site managers can create building control for their sites"
  ON building_control FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_managers sm
      WHERE sm.manager_id = auth.uid()
      AND sm.site_id = building_control.site_id
    )
  );

-- Workers policies
CREATE POLICY "Admins can manage workers"
  ON workers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Site managers can view workers"
  ON workers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'site_manager'
    )
  );

CREATE POLICY "Workers can view own data"
  ON workers FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Workers can update own status"
  ON workers FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Worker assignments policies
CREATE POLICY "Admins can manage worker assignments"
  ON worker_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Site managers can view their site worker assignments"
  ON worker_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM site_managers sm
      WHERE sm.manager_id = auth.uid()
      AND sm.site_id = worker_assignments.site_id
    )
  );

CREATE POLICY "Workers can view own assignments"
  ON worker_assignments FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

-- Time logs policies
CREATE POLICY "Admins can view all time logs"
  ON time_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Site managers can view their site time logs"
  ON time_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM site_managers sm
      WHERE sm.manager_id = auth.uid()
      AND sm.site_id = time_logs.site_id
    )
  );

CREATE POLICY "Workers can view own time logs"
  ON time_logs FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

CREATE POLICY "Workers can insert own time logs"
  ON time_logs FOR INSERT
  TO authenticated
  WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Workers can update own time logs"
  ON time_logs FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());