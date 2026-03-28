
-- Add updated_at and updated_by to building_control
ALTER TABLE public.building_control ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.building_control ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Add geolocation columns to building_control_photos
ALTER TABLE public.building_control_photos ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.building_control_photos ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.building_control_photos ADD COLUMN IF NOT EXISTS location_address text;
ALTER TABLE public.building_control_photos ADD COLUMN IF NOT EXISTS taken_at timestamptz;

-- RLS: Site managers can update building_control for their sites
CREATE POLICY "Site managers can update their site building control"
ON public.building_control FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM site_managers sm WHERE sm.manager_id = auth.uid() AND sm.site_id = building_control.site_id))
WITH CHECK (EXISTS (SELECT 1 FROM site_managers sm WHERE sm.manager_id = auth.uid() AND sm.site_id = building_control.site_id));

-- RLS: Site managers can delete building_control for their sites
CREATE POLICY "Site managers can delete their site building control"
ON public.building_control FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM site_managers sm WHERE sm.manager_id = auth.uid() AND sm.site_id = building_control.site_id));

-- RLS: Site managers can delete building_control_photos (via building_control join)
CREATE POLICY "Site managers can delete building control photos"
ON public.building_control_photos FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM building_control bc
  JOIN site_managers sm ON sm.site_id = bc.site_id
  WHERE bc.id = building_control_photos.building_control_id AND sm.manager_id = auth.uid()
));

-- RLS: Workers can SELECT building_control for their assigned sites
CREATE POLICY "Workers can view building control for assigned sites"
ON public.building_control FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM worker_assignments wa
  WHERE wa.worker_id = auth.uid() AND wa.site_id = building_control.site_id AND wa.removed_at IS NULL
));

-- RLS: Workers can INSERT building_control for their assigned sites
CREATE POLICY "Workers can create building control for assigned sites"
ON public.building_control FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM worker_assignments wa
  WHERE wa.worker_id = auth.uid() AND wa.site_id = building_control.site_id AND wa.removed_at IS NULL
));

-- RLS: Workers can UPDATE building_control for their assigned sites
CREATE POLICY "Workers can update building control for assigned sites"
ON public.building_control FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM worker_assignments wa
  WHERE wa.worker_id = auth.uid() AND wa.site_id = building_control.site_id AND wa.removed_at IS NULL
))
WITH CHECK (EXISTS (
  SELECT 1 FROM worker_assignments wa
  WHERE wa.worker_id = auth.uid() AND wa.site_id = building_control.site_id AND wa.removed_at IS NULL
));

-- RLS: Workers can DELETE building_control for their assigned sites
CREATE POLICY "Workers can delete building control for assigned sites"
ON public.building_control FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM worker_assignments wa
  WHERE wa.worker_id = auth.uid() AND wa.site_id = building_control.site_id AND wa.removed_at IS NULL
));

-- RLS: Workers can insert building_control_photos
CREATE POLICY "Workers can insert building control photos"
ON public.building_control_photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- RLS: Workers can delete building_control_photos they created
CREATE POLICY "Workers can delete their building control photos"
ON public.building_control_photos FOR DELETE TO authenticated
USING (auth.uid() = created_by);
