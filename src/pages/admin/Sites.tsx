import { Building, MapPin, Plus, Trash2, Edit, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Layout } from "../../components/Layout";
import { supabase } from "../../integrations/supabase/client";
import { Site, SiteItem, Item } from "../../types";
import { capitalizeWords } from "../../utils/capitalize";

interface SiteWithItems extends Site {
  items: (SiteItem & { item: Item })[];
}

export function AdminSites() {
  const [sites, setSites] = useState<SiteWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [showNewSiteModal, setShowNewSiteModal] = useState(false);
  const [showEditSiteModal, setShowEditSiteModal] = useState(false);
  const [newSite, setNewSite] = useState({
    name: "",
    location: "",
    description: "",
  });
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    siteId: string;
    siteName: string;
  }>({
    isOpen: false,
    siteId: "",
    siteName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter sites by name/location
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
  }, []);

  const loadSites = async () => {
    const { data: sitesData } = await supabase.from("sites").select("*").order("name");
    
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

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("sites").insert(newSite);

    if (!error) {
      setNewSite({ name: "", location: "", description: "" });
      setShowNewSiteModal(false);
      loadSites();
    }
  };

  const openEditModal = (site: Site) => {
    setEditingSite({
      ...site,
      name: capitalizeWords(site.name),
      location: capitalizeWords(site.location),
    });
    setShowEditSiteModal(true);
  };

  const handleEditSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;

    const { error } = await supabase
      .from("sites")
      .update({
        name: editingSite.name,
        location: editingSite.location,
        description: editingSite.description,
      })
      .eq("id", editingSite.id);

    if (!error) {
      setEditingSite(null);
      setShowEditSiteModal(false);
      loadSites();
    }
  };

  const openDeleteDialog = (id: string, name: string) => {
    setDeleteDialog({ isOpen: true, siteId: id, siteName: name });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, siteId: "", siteName: "" });
    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    const { error } = await supabase
      .from("sites")
      .delete()
      .eq("id", deleteDialog.siteId);

    if (!error) {
      closeDeleteDialog();
      loadSites();
    } else {
      alert("Failed to delete site: " + error.message);
      closeDeleteDialog();
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Sites Management
            </h1>
            <p className="text-gray-600 mt-1">Manage all construction sites</p>
          </div>
          <button
            onClick={() => setShowNewSiteModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create Site</span>
          </button>
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
              No Sites Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first site to get started.
            </p>
            <button
              onClick={() => setShowNewSiteModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Create First Site</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSites.filter(siteHasMatchingItems).map((site) => (
              <div
                key={site.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-gradient-to-br from-[#0db2ad] to-[#567fca] p-3 rounded-lg">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEditModal(site)}
                        className="p-2 text-[#0db2ad] hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openDeleteDialog(site.id, site.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {capitalizeWords(site.name)}
                  </h3>
                  <div className="flex items-center space-x-2 text-gray-600 text-sm mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{capitalizeWords(site.location)}</span>
                  </div>
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
                    to={`/admin/sites/${site.id}`}
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

      {showNewSiteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Create New Site
            </h2>
            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  value={newSite.name}
                  onChange={(e) =>
                    setNewSite({ ...newSite, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={newSite.location}
                  onChange={(e) =>
                    setNewSite({ ...newSite, location: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newSite.description}
                  onChange={(e) =>
                    setNewSite({ ...newSite, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewSiteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
                >
                  Create Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditSiteModal && editingSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Edit Site
            </h2>
            <form onSubmit={handleEditSite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  value={editingSite.name}
                  onChange={(e) =>
                    setEditingSite({ ...editingSite, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={editingSite.location ?? ""}
                  onChange={(e) =>
                    setEditingSite({ ...editingSite, location: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingSite.description || ""}
                  onChange={(e) =>
                    setEditingSite({ ...editingSite, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSiteModal(false);
                    setEditingSite(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
                >
                  Update Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Site"
        message={`Are you sure you want to delete ${deleteDialog.siteName}? This will remove all associated data.`}
        confirmLabel="Yes, Delete"
        cancelLabel="No, Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteDialog}
        isProcessing={isDeleting}
      />
    </Layout>
  );
}
