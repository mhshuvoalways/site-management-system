import { User, UserCog, Users } from "lucide-react";
import { capitalizeWords } from "../../utils/capitalize";
import { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { supabase } from "../../integrations/supabase/client";
import { Profile } from "../../types";

export function SiteManagerUsersView() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>("all");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(data || []);
    setLoading(false);
  };

  const filteredUsers =
    filterRole === "all" ? users : users.filter((u) => u.role === filterRole);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Users className="w-6 h-6 text-white" />;
      case "site_manager":
        return <UserCog className="w-6 h-6 text-white" />;
      case "worker":
        return <User className="w-6 h-6 text-white" />;
      default:
        return <Users className="w-6 h-6 text-white" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "from-red-500 to-red-600";
      case "site_manager":
        return "from-[#0db2ad] to-[#567fca]";
      case "worker":
        return "from-orange-500 to-orange-600";
      default:
        return "from-gray-500 to-gray-600";
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">
            View all users in the system
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterRole("all")}
              className={`px-4 py-2 rounded-lg transition ${
                filterRole === "all"
                  ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Users ({users.length})
            </button>
            <button
              onClick={() => setFilterRole("admin")}
              className={`px-4 py-2 rounded-lg transition ${
                filterRole === "admin"
                  ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Admins ({users.filter((u) => u.role === "admin").length})
            </button>
            <button
              onClick={() => setFilterRole("site_manager")}
              className={`px-4 py-2 rounded-lg transition ${
                filterRole === "site_manager"
                  ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Site Managers (
              {users.filter((u) => u.role === "site_manager").length})
            </button>
            <button
              onClick={() => setFilterRole("worker")}
              className={`px-4 py-2 rounded-lg transition ${
                filterRole === "worker"
                  ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Workers ({users.filter((u) => u.role === "worker").length})
            </button>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Users Found
            </h3>
            <p className="text-gray-600">
              No users match the current filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`bg-gradient-to-r ${getRoleColor(
                      user.role
                    )} p-3 rounded-lg`}
                  >
                    {getRoleIcon(user.role)}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {capitalizeWords(user.full_name)}
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{user.email}</p>
                  {user.phone && (
                    <p className="text-sm text-gray-600">{user.phone}</p>
                  )}
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700">
                    {user.role === "admin"
                      ? "Admin"
                      : user.role === "site_manager"
                      ? "Site Manager"
                      : "Worker"}
                  </span>
                  <p className="text-xs text-gray-500 pt-2">
                    Created {new Date(user.created_at ?? "").toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
