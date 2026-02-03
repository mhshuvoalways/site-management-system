import { Building, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import { Site, SiteItem, Item } from "../../types";
import { capitalizeWords } from "../../utils/capitalize";

interface SiteWithItems extends Site {
  items: (SiteItem & { item: Item })[];
}

export function SiteManagerSitesList() {
  const { profile } = useAuth();
  const [sites, setSites] = useState<SiteWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemSearchTerm, setItemSearchTerm] = useState("");

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (site.location?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  // Highlight matching text in item names
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-300 text-yellow-900 font-semibold rounded px-0.5">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Check if site has matching items
  const siteHasMatchingItems = (site: SiteWithItems) => {
    if (!itemSearchTerm.trim()) return true;
    return (site.items || []).some(siteItem => 
      siteItem.item?.name?.toLowerCase().includes(itemSearchTerm.toLowerCase())
    );
  };

  useEffect(() => {
    loadSites();
  }, [profile]);

  const loadSites = async () => {
    if (!profile) return;

    const { data: sitesData } = await supabase
      .from("sites")
      .select("*")
      .order("name");

    const { data: siteItemsData } = await supabase
      .from("site_items")
      .select("*, item:items(*)");

    const sitesWithItems: SiteWithItems[] = (sitesData || []).map((site) => ({
      ...site,
      items: (siteItemsData || []).filter((si) => si.site_id === site.id) as (SiteItem & { item: Item })[],
    }));

    setSites(sitesWithItems);
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
            {filteredSites.filter(siteHasMatchingItems).map((site) => (
              <div
                key={site.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 overflow-hidden"
              >
                <div className="p-6">
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
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                      {site.description}
                    </p>
                  )}
                  
                  {/* Assigned Items Section */}
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Assigned Items ({(site.items || []).length})
                      </span>
                    </div>
                    {(!site.items || site.items.length === 0) ? (
                      <p className="text-sm text-gray-400 italic">No items assigned</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                        {(site.items || [])
                          .slice()
                          .sort((a, b) => {
                            if (!itemSearchTerm.trim()) return 0;
                            const aMatch = a.item?.name?.toLowerCase().includes(itemSearchTerm.toLowerCase());
                            const bMatch = b.item?.name?.toLowerCase().includes(itemSearchTerm.toLowerCase());
                            if (aMatch && !bMatch) return -1;
                            if (!aMatch && bMatch) return 1;
                            return 0;
                          })
                          .map((siteItem) => {
                          const itemName = capitalizeWords(siteItem.item?.name || "Unknown");
                          const isMatch = itemSearchTerm.trim() && 
                            siteItem.item?.name?.toLowerCase().includes(itemSearchTerm.toLowerCase());
                          
                          return (
                            <div
                              key={siteItem.id}
                              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                                isMatch ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                              }`}
                            >
                              <span className="text-gray-700 truncate flex-1">
                                {highlightText(itemName, itemSearchTerm)}
                              </span>
                              <span className="text-gray-500 font-medium ml-2">
                                x{siteItem.quantity ?? 0}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <Link
                    to={`/site-manager/sites/${site.id}`}
                    className="text-[#0db2ad] hover:text-[#567fca] font-medium text-sm transition"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
