import { Building, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { SiteCard } from "../../components/SiteCard";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import { Site } from "../../types";

export function SiteManagerSitesList() {
  const { profile } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemSearchTerm, setItemSearchTerm] = useState("");

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (site.location?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  useEffect(() => {
    loadSites();
  }, [profile]);

  const loadSites = async () => {
    if (!profile) return;

    const { data: sitesData } = await supabase
      .from("sites")
      .select("*")
      .order("name");

    setSites(sitesData || []);
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
          <h1 className="text-3xl font-bold text-gray-900">All Sites</h1>
          <p className="text-gray-600 mt-1">
            View and manage all sites
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search sites by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
            />
          </div>
          <div className="relative flex-1 max-w-md">
            <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search items across all sites..."
              value={itemSearchTerm}
              onChange={(e) => setItemSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#567fca] focus:border-transparent outline-none"
            />
          </div>
        </div>

        {filteredSites.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Sites Available
            </h3>
            <p className="text-gray-600">
              No sites have been created yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                linkPrefix="/site-manager/sites"
                itemSearchTerm={itemSearchTerm}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
