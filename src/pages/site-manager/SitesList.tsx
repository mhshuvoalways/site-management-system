import { Building } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Site } from "../../types";

export function SiteManagerSitesList() {
  const { profile } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSites();
  }, [profile]);

  const loadSites = async () => {
    if (!profile) return;

    const { data: siteManagers } = await supabase
      .from("site_managers")
      .select("site_id")
      .eq("manager_id", profile.id);

    if (siteManagers && siteManagers.length > 0) {
      const siteIds = siteManagers.map((sm) => sm.site_id);
      const { data } = await supabase
        .from("sites")
        .select("*")
        .in("id", siteIds)
        .order("name");

      setSites(data || []);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0db2ad]"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Sites</h1>
          <p className="text-gray-600 mt-1">
            View and manage your assigned sites
          </p>
        </div>

        {sites.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Sites Assigned
            </h3>
            <p className="text-gray-600">
              You haven't been assigned to any sites yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <Link
                key={site.id}
                to={`/site-manager/sites/${site.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 border border-gray-100"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-gradient-to-br from-[#0db2ad] to-[#567fca] p-3 rounded-lg">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {site.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">{site.location}</p>
                {site.description && (
                  <p className="text-gray-500 text-sm line-clamp-2">
                    {site.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
