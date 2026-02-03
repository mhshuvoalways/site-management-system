import { Building, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import { Site } from "../../types";
import { capitalizeWords } from "../../utils/capitalize";

export function SiteManagerSitesList() {
  const { profile } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

    // Site managers can see ALL sites - no assignment needed
    const { data } = await supabase
      .from("sites")
      .select("*")
      .order("name");

    setSites(data || []);
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

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search sites by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
          />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSites.map((site) => (
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
                  {capitalizeWords(site.name)}
                </h3>
                <p className="text-gray-600 text-sm mb-4">{capitalizeWords(site.location)}</p>
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
