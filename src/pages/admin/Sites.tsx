import { Building, Plus, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Layout } from "../../components/Layout";
import { SiteCard } from "../../components/SiteCard";
import { supabase } from "../../integrations/supabase/client";
import { Site } from "../../types";
import { capitalizeWords } from "../../utils/capitalize";

export function AdminSites() {
  const [sites, setSites] = useState<Site[]>([]);
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

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    const { data: sitesData } = await supabase.from("sites").select("*").order("name");
    setSites(sitesData || []);
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
            {filteredSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                linkPrefix="/admin/sites"
                itemSearchTerm={itemSearchTerm}
                onEdit={openEditModal}
                onDelete={openDeleteDialog}
                showActions
              />
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
