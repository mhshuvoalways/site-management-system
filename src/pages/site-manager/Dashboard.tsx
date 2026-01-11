import { Building, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Site } from "../../types";

export function SiteManagerDashboard() {
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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Site Manager Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your assigned construction sites.
          </p>
        </div>

        {sites.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Sites Assigned
            </h3>
            <p className="text-gray-600">
              You haven't been assigned to any sites yet. Contact your
              administrator.
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

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/site-manager/sites"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-[#0db2ad]" />
                <span className="font-medium text-gray-900">
                  View All Sites
                </span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-[#567fca]" />
                <span className="font-medium text-gray-900">Total Sites</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {sites.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
