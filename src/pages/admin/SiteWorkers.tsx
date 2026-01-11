import { ArrowLeft, Plus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { supabase } from "../../integrations/supabase/client";
import { Profile, Site, Worker, WorkerAssignment } from "../../types";

export function SiteWorkersPage() {
  const { id } = useParams();
  const [site, setSite] = useState<Site | null>(null);
  const [assignments, setAssignments] = useState<
    (WorkerAssignment & { worker: Worker & { profile: Profile } })[]
  >([]);
  const [availableWorkers, setAvailableWorkers] = useState<
    (Worker & { profile: Profile })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    const [siteData, assignmentsData] = await Promise.all([
      supabase.from("sites").select("*").eq("id", id).single(),
      supabase
        .from("worker_assignments")
        .select(
          "*, worker:workers(*, profile:profiles(*)), assigned_by_profile:profiles!assigned_by(*)"
        )
        .eq("site_id", id)
        .is("removed_at", null),
    ]);

    setSite(siteData.data);
    setAssignments(assignmentsData.data || []);

    const assignedWorkerIds = (assignmentsData.data || []).map(
      (a) => a.worker_id
    );

    const { data: allWorkers } = await supabase
      .from("workers")
      .select("*, profile:profiles(*)")
      .order("created_at", { ascending: false });

    const available = (allWorkers || []).filter(
      (w) => !assignedWorkerIds.includes(w.id)
    );

    setAvailableWorkers(available);
    setLoading(false);
  };

  const handleAssignWorker = async (e: React.FormEvent) => {
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
      setShowAssignModal(false);
      setSelectedWorkerId("");
      loadData();
    }
  };

  const handleRemoveWorker = async (assignmentId: string, workerId: string) => {
    if (!confirm("Are you sure you want to remove this worker from the site?"))
      return;

    await supabase
      .from("worker_assignments")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", assignmentId);

    await supabase.from("workers").update({ status: "off" }).eq("id", workerId);

    loadData();
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
            <h1 className="text-3xl font-bold text-gray-900">Site Workers</h1>
            <p className="text-gray-600 mt-1">{site.name}</p>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Assign Worker</span>
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Workers Assigned
            </h3>
            <p className="text-gray-600 mb-6">
              Assign workers to this site to get started.
            </p>
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Assign First Worker</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <button
                    onClick={() =>
                      handleRemoveWorker(assignment.id, assignment.worker_id)
                    }
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {assignment.worker.profile.full_name}
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    {assignment.worker.profile.email}
                  </p>
                  {assignment.worker.phone && (
                    <p className="text-gray-600">{assignment.worker.phone}</p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        assignment.worker.status === "working"
                          ? "bg-green-100 text-green-700"
                          : assignment.worker.status === "sick"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {assignment.worker.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 pt-2">
                    Assigned:{" "}
                    {new Date(assignment.assigned_at ?? "").toLocaleDateString()}
                    {assignment.assigned_by_profile && (
                      <> by {assignment.assigned_by_profile.full_name}</>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Assign Worker to Site
            </h2>
            {availableWorkers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">
                  No available workers. All workers are already assigned to
                  sites.
                </p>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleAssignWorker} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Worker
                  </label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Choose a worker...</option>
                    {availableWorkers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.profile.full_name} ({worker.profile.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedWorkerId("");
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
                  >
                    Assign Worker
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
