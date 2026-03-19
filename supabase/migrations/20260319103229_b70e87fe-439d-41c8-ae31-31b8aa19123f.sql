
-- Create item_requests table
CREATE TABLE public.item_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.item_requests ENABLE ROW LEVEL SECURITY;

-- Site managers can insert their own requests
CREATE POLICY "Site managers can insert requests"
ON public.item_requests FOR INSERT TO authenticated
WITH CHECK (
  requested_by = auth.uid() AND
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'site_manager')
);

-- Site managers can view their own requests
CREATE POLICY "Site managers can view own requests"
ON public.item_requests FOR SELECT TO authenticated
USING (
  requested_by = auth.uid() AND
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'site_manager')
);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.item_requests FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Admins can update requests (approve/decline)
CREATE POLICY "Admins can update requests"
ON public.item_requests FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
