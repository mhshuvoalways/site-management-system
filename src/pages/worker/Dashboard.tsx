import { Calendar, Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import { Site, TimeLog } from "../../types";

export function WorkerDashboard() {
  const { profile } = useAuth();
  const location = useLocation();
  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [todayHours, setTodayHours] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.pathname === "/worker") {
      loadData();
    }
  }, [profile, location.pathname]);

  const loadData = async () => {
    if (!profile) return;

    const { data: assignments } = await supabase
      .from("worker_assignments")
      .select("site_id, sites(*)")
      .eq("worker_id", profile.id)
      .is("removed_at", null);

    let sites: Site[] = [];
    if (assignments && assignments.length > 0) {
      sites = assignments.map((a) => a.sites as unknown as Site);
      setAssignedSites(sites);
    }

    const { data: log } = await supabase
      .from("time_logs")
      .select("*")
      .eq("worker_id", profile.id)
      .is("clock_out", null)
      .maybeSingle();

    if (log) {
      setActiveLog(log);
      const activeSite = sites.find((s) => s.id === log.site_id);
      if (activeSite) {
        setSelectedSite(activeSite);
      }
    } else if (sites.length === 1) {
      setSelectedSite(sites[0]);
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: todayLogs } = await supabase
      .from("time_logs")
      .select("total_hours")
      .eq("worker_id", profile.id)
      .gte("clock_in", `${today}T00:00:00`)
      .not("total_hours", "is", null);

    const hours =
      todayLogs?.reduce((sum, log) => sum + (log.total_hours || 0), 0) || 0;
    setTodayHours(hours);
    setLoading(false);
  };

  const handleClockIn = async () => {
    if (!profile || !selectedSite) return;

    const { data, error } = await supabase
      .from("time_logs")
      .insert({
        worker_id: profile.id,
        site_id: selectedSite.id,
        clock_in: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      setActiveLog(data);
      await supabase
        .from("workers")
        .update({ status: "working" })
        .eq("id", profile.id);
    }
  };

  const handleClockOut = async () => {
    if (!profile || !activeLog) return;

    const clockOut = new Date();
    const clockIn = new Date(activeLog.clock_in);
    const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

    const { error } = await supabase
      .from("time_logs")
      .update({
        clock_out: clockOut.toISOString(),
        total_hours: hours,
      })
      .eq("id", activeLog.id);

    if (!error) {
      setActiveLog(null);
      setTodayHours(todayHours + hours);
      await supabase
        .from("workers")
        .update({ status: "off" })
        .eq("id", profile.id);
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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Worker Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Track your time and manage your work across sites.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Status</span>
              <div
                className={`w-3 h-3 rounded-full ${
                  activeLog ? "bg-green-500" : "bg-gray-300"
                }`}
              ></div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {activeLog ? "Working" : "Off Duty"}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-[#0db2ad]" />
              <span className="text-sm font-medium text-gray-600">
                Today's Hours
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {todayHours.toFixed(2)} hrs
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="w-5 h-5 text-[#567fca]" />
              <span className="text-sm font-medium text-gray-600">
                Assigned Sites
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {assignedSites.length}
            </p>
          </div>
        </div>

        {assignedSites.length > 0 ? (
          <div className="space-y-6">
            {assignedSites.length > 1 && !activeLog && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Select Site to Clock In
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignedSites.map((site) => (
                    <button
                      key={site.id}
                      onClick={() => setSelectedSite(site)}
                      className={`p-4 border-2 rounded-lg text-left transition ${
                        selectedSite?.id === site.id
                          ? "border-[#0db2ad] bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <MapPin
                          className={`w-5 h-5 mt-1 ${
                            selectedSite?.id === site.id
                              ? "text-[#0db2ad]"
                              : "text-gray-400"
                          }`}
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {site.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {site.location}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedSite && (
              <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                <div className="flex items-center justify-center space-x-2 mb-6">
                  <MapPin className="w-5 h-5 text-[#0db2ad]" />
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedSite.name}
                  </h2>
                </div>
                {activeLog ? (
                  <div className="text-center space-y-6">
                    <div>
                      <p className="text-gray-600 mb-2">Clocked in at</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {new Date(activeLog.clock_in).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={handleClockOut}
                      className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:shadow-lg transition text-lg"
                    >
                      Clock Out
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-6">
                    <div className="flex items-center justify-center space-x-2 text-gray-600">
                      <Calendar className="w-5 h-5" />
                      <p>{new Date().toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={handleClockIn}
                      disabled={!selectedSite}
                      className="px-8 py-4 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg font-medium hover:shadow-lg transition text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clock In
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Site Assigned
            </h3>
            <p className="text-gray-600">
              You haven't been assigned to a site yet. Contact your manager.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
