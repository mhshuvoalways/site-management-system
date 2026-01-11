import { ArrowLeft, Calendar, Clock, Filter, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Site, TimeLog } from "../../types";

interface TimeLogWithSite extends TimeLog {
  site: Site;
}

export function WorkerTimeLogs() {
  const { profile } = useAuth();
  const [timeLogs, setTimeLogs] = useState<TimeLogWithSite[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<TimeLogWithSite[]>([]);
  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    filterLogs();
  }, [timeLogs, selectedSite, dateRange]);

  const loadData = async () => {
    if (!profile) return;

    const { data: assignments } = await supabase
      .from("worker_assignments")
      .select("sites(*)")
      .eq("worker_id", profile.id)
      .is("removed_at", null);

    if (assignments) {
      const sites = assignments.map((a) => a.sites as unknown as Site);
      setAssignedSites(sites);
    }

    const { data: logs } = await supabase
      .from("time_logs")
      .select("*, site:sites(*)")
      .eq("worker_id", profile.id)
      .order("clock_in", { ascending: false });

    if (logs) {
      setTimeLogs(logs as TimeLogWithSite[]);
    }

    setLoading(false);
  };

  const filterLogs = () => {
    let filtered = [...timeLogs];

    if (selectedSite !== "all") {
      filtered = filtered.filter((log) => log.site_id === selectedSite);
    }

    if (dateRange.start) {
      filtered = filtered.filter((log) => log.clock_in >= dateRange.start);
    }

    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(
        (log) => log.clock_in <= endDate.toISOString()
      );
    }

    setFilteredLogs(filtered);
  };

  const getTotalHours = () => {
    return filteredLogs
      .filter((log) => log.total_hours !== null)
      .reduce((sum, log) => sum + (log.total_hours || 0), 0);
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
            <div className="flex items-center space-x-3 mb-2">
              <Link
                to="/worker"
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Time Logs</h1>
            </div>
            <p className="text-gray-600">View your work history and hours.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-[#0db2ad]" />
              <span className="text-sm font-medium text-gray-600">
                Total Hours
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {getTotalHours().toFixed(2)} hrs
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-[#567fca]" />
              <span className="text-sm font-medium text-gray-600">
                Total Days
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {
                new Set(filteredLogs.map((log) => log.clock_in.split("T")[0]))
                  .size
              }
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-600">
                Total Logs
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {filteredLogs.length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-bold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site
              </label>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
              >
                <option value="all">All Sites</option>
                {assignedSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Time Logs
              </h3>
              <p className="text-gray-600">
                No time logs found for the selected filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatDate(log.clock_in)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-[#0db2ad]" />
                          <span className="text-sm font-medium text-gray-900">
                            {log.site.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {formatTime(log.clock_in)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.clock_out ? (
                          <span className="text-sm text-gray-900">
                            {formatTime(log.clock_out)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.total_hours !== null ? (
                          <span className="text-sm font-medium text-gray-900">
                            {formatDuration(log.total_hours)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
