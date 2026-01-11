export type UserRole = 'admin' | 'site_manager' | 'worker';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Site {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Item {
  id: string;
  name: string;
  item_type: string;
  quantity: number;
  photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SiteItem {
  id: string;
  site_id: string;
  item_id: string;
  quantity: number | null;
  created_at: string | null;
  updated_at: string | null;
  item?: Item;
}

export interface Transfer {
  id: string;
  item_id: string;
  from_site_id: string | null;
  to_site_id: string | null;
  quantity: number;
  transferred_by: string;
  created_at: string | null;
  item?: Item;
  from_site?: Site;
  to_site?: Site;
  transferred_by_profile?: Profile;
}

export interface BuildingControl {
  id: string;
  site_id: string;
  notes: string;
  images: unknown;
  created_by: string;
  created_at: string | null;
  created_by_profile?: Partial<Profile>;
  photos?: BuildingControlPhoto[];
}

export interface BuildingControlPhoto {
  id: string;
  building_control_id: string;
  photo_url: string;
  notes: string | null;
  created_at: string | null;
  created_by: string;
  created_by_profile?: Partial<Profile>;
}

export interface Worker {
  id: string;
  phone: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  profile?: Profile;
}

export interface WorkerAssignment {
  id: string;
  worker_id: string;
  site_id: string;
  assigned_by: string | null;
  assigned_at: string | null;
  removed_at: string | null;
  worker?: Worker;
  site?: Site;
  assigned_by_profile?: Profile | null;
}

export interface TimeLog {
  id: string;
  worker_id: string;
  site_id: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  site?: Site;
}

export interface SiteManager {
  id: string;
  site_id: string;
  manager_id: string;
  assigned_at: string | null;
  manager?: Profile;
}