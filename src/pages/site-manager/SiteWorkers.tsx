import { ArrowLeft, Plus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { Site, Worker, WorkerAssignment } from "../../types";

interface WorkerWithAssignment extends Worker {
  assignment?: WorkerAssignment | null;
}

export function SiteManagerSiteWorkers() {
  const { id } = useParams();
  const [site, setSite] = useState<Site | null>(null);
  const [workers, setWorkers] = useState<WorkerWithAssignment[]>([]);
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    const [siteData, assignmentsData, allWorkersData] = await Promise.all([
      supabase.from("sites").select("*").eq("id", id).single(),
      supabase
        .from("worker_assignments")
        .select(
          "*, worker:workers(*, profile:profiles(*)), assigned_by_profile:profiles!assigned_by(*)"
        )
        .eq("site_id", id)
        .is("removed_at", null),
      supabase
        .from("workers")
        .select("*, profile:profiles(*)")
        .order("profile(full_name)"),
    ]);

    if (siteData.data) {
      setSite(siteData.data);
    }

    if (assignmentsData.data) {
      const assignedWorkers: WorkerWithAssignment[] = assignmentsData.data.map(
        (assignment) => ({
          ...assignment.worker,
          assignment,
        })
      );
      setWorkers(assignedWorkers);

      const assignedWorkerIds = new Set(
        assignmentsData.data.map((a) => a.worker_id)
      );
      const available = (allWorkersData.data || []).filter(
        (worker) => !assignedWorkerIds.has(worker.id)
      );
      setAvailableWorkers(available);
    } else {
      setAvailableWorkers(allWorkersData.data || []);
    }

    setLoading(false);
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedWorkerId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("worker_assignments").insert({
      worker_id: selectedWorkerId,
      site_id: id,
      assigned_by: user.id,
    });

    if (!error) {
      setShowAddModal(false);
      setSelectedWorkerId("");
      loadData();
    }
  };

  const handleRemoveWorker = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to remove this worker from the site?"))
      return;

    const { error } = await supabase
      .from("worker_assignments")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", assignmentId);

    if (!error) {
      loadData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "working":
        return "bg-green-100 text-green-700";
      case "off":
        return "bg-gray-100 text-gray-700";
      case "sick":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
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
            to={`/site-manager/sites/${id}`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Site Workers</h1>
            <p className="text-gray-600 mt-1">{site.name}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Worker</span>
          </button>
        </div>

        {workers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Workers Assigned
            </h3>
            <p className="text-gray-600 mb-6">
              Assign workers to this site to get started.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Add First Worker</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-[#0db2ad] to-[#567fca] p-3 rounded-full">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {worker.profile?.full_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {worker.profile?.email}
                      </p>
                    </div>
                  </div>
                  {worker.assignment && (
                    <button
                      onClick={() => handleRemoveWorker(worker.assignment!.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                      title="Remove from site"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Status: </span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        worker.status
                      )}`}
                    >
                      {worker.status.charAt(0).toUpperCase() +
                        worker.status.slice(1)}
                    </span>
                  </div>
                  {worker.phone && (
                    <div>
                      <span className="text-sm text-gray-600">Phone: </span>
                      <span className="text-sm text-gray-900">
                        {worker.phone}
                      </span>
                    </div>
                  )}
                  {worker.assignment && (
                    <div>
                      <span className="text-sm text-gray-600">Assigned: </span>
                      <span className="text-sm text-gray-900">
                        {new Date(
                          worker.assignment.assigned_at
                        ).toLocaleDateString()}
                        {worker.assignment.assigned_by_profile && (
                          <>
                            {" "}
                            by {worker.assignment.assigned_by_profile.full_name}
                          </>
                        )}
                      </span>
                    </div>
                  )}
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
              Add Worker to Site
            </h2>
            <form onSubmit={handleAddWorker} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Worker
                </label>
                {availableWorkers.length === 0 ? (
                  <p className="text-sm text-gray-600 py-4">
                    All workers are already assigned to this site.
                  </p>
                ) : (
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Choose a worker...</option>
                    {availableWorkers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.profile?.full_name} ({worker.status})
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
                    setSelectedWorkerId("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={availableWorkers.length === 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
