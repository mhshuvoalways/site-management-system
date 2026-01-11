import { ArrowLeft, Plus, UserCog, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { Profile, Site } from "../../types";

interface SiteManager {
  id: string;
  site_id: string;
  manager_id: string;
  assigned_at: string;
  manager?: Profile;
}

export function AdminSiteManagers() {
  const { id } = useParams();
  const [site, setSite] = useState<Site | null>(null);
  const [siteManagers, setSiteManagers] = useState<SiteManager[]>([]);
  const [availableManagers, setAvailableManagers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    const [siteData, assignmentsData, allManagersData] = await Promise.all([
      supabase.from("sites").select("*").eq("id", id).single(),
      supabase
        .from("site_managers")
        .select("*, manager:profiles!site_managers_manager_id_fkey(*)")
        .eq("site_id", id),
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "site_manager")
        .order("full_name"),
    ]);

    if (siteData.data) {
      setSite(siteData.data);
    }

    if (assignmentsData.data) {
      setSiteManagers(assignmentsData.data);

      const assignedManagerIds = new Set(
        assignmentsData.data.map((a) => a.manager_id)
      );
      const available = (allManagersData.data || []).filter(
        (manager) => !assignedManagerIds.has(manager.id)
      );
      setAvailableManagers(available);
    } else {
      setAvailableManagers(allManagersData.data || []);
    }

    setLoading(false);
  };

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedManagerId) return;

    const { error } = await supabase.from("site_managers").insert({
      site_id: id,
      manager_id: selectedManagerId,
    });

    if (!error) {
      setShowAddModal(false);
      setSelectedManagerId("");
      loadData();
    }
  };

  const handleRemoveManager = async (assignmentId: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this site manager from the site?"
      )
    )
      return;

    const { error } = await supabase
      .from("site_managers")
      .delete()
      .eq("id", assignmentId);

    if (!error) {
      loadData();
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

  if (!site) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Site not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link
            to={`/admin/sites/${id}`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Site Managers</h1>
            <p className="text-gray-600 mt-1">{site.name}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Site Manager</span>
          </button>
        </div>

        {siteManagers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <UserCog className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Site Managers Assigned
            </h3>
            <p className="text-gray-600 mb-6">
              Assign site managers to this site to get started.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Add First Site Manager</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {siteManagers.map((sm) => (
              <div
                key={sm.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 rounded-full">
                      <UserCog className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {sm.manager?.full_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {sm.manager?.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveManager(sm.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                    title="Remove from site"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Assigned: </span>
                    <span className="text-sm text-gray-900">
                      {new Date(sm.assigned_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Add Site Manager
            </h2>
            <form onSubmit={handleAddManager} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Site Manager
                </label>
                {availableManagers.length === 0 ? (
                  <p className="text-sm text-gray-600 py-4">
                    All site managers are already assigned to this site.
                  </p>
                ) : (
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Choose a site manager...</option>
                    {availableManagers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.full_name} ({manager.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedManagerId("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={availableManagers.length === 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
