import { Building, Package, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { supabase } from "../../integrations/supabase/client";

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSites: 0,
    totalEquipment: 0,
    totalMaterials: 0,
    totalWorkers: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [sites, items, workers] = await Promise.all([
      supabase.from("sites").select("id", { count: "exact", head: true }),
      supabase.from("items").select("*"),
      supabase.from("workers").select("id", { count: "exact", head: true }),
    ]);

    const equipment =
      items.data?.filter((i) => i.item_type === "equipment").length || 0;
    const materials =
      items.data?.filter((i) => i.item_type === "material").length || 0;

    setStats({
      totalSites: sites.count || 0,
      totalEquipment: equipment,
      totalMaterials: materials,
      totalWorkers: workers.count || 0,
    });
  };

  const statCards = [
    {
      label: "Total Sites",
      value: stats.totalSites,
      icon: Building,
      color: "from-blue-500 to-blue-600",
      link: "/admin/sites",
    },
    {
      label: "Equipment Items",
      value: stats.totalEquipment,
      icon: Package,
      color: "from-[#0db2ad] to-teal-600",
      link: "/admin/storage",
    },
    {
      label: "Material Items",
      value: stats.totalMaterials,
      icon: Package,
      color: "from-[#567fca] to-purple-600",
      link: "/admin/storage",
    },
    {
      label: "Total Workers",
      value: stats.totalWorkers,
      icon: Users,
      color: "from-orange-500 to-orange-600",
      link: "/admin/users",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's your system overview.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              to={stat.link}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`bg-gradient-to-br ${stat.color} p-3 rounded-lg`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Link
                to="/admin/sites"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-[#0db2ad]" />
                  <span className="font-medium text-gray-900">
                    Manage Sites
                  </span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                to="/admin/storage"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center space-x-3">
                  <Package className="w-5 h-5 text-[#567fca]" />
                  <span className="font-medium text-gray-900">
                    Storage Database
                  </span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              System Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Sites Active</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {stats.totalSites}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Workers Online</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  {stats.totalWorkers}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
