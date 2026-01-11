import { Edit2, Plus, Trash2, User, UserCog, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Layout } from "../../components/Layout";
import { supabase } from "../../integrations/supabase/client";
import { Profile } from "../../types";

export function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "worker" as "admin" | "site_manager" | "worker",
    phone: "",
  });
  const [editUser, setEditUser] = useState({
    id: "",
    email: "",
    full_name: "",
    role: "worker" as "admin" | "site_manager" | "worker",
    phone: "",
  });
  const [processing, setProcessing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: "",
    userName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        alert("Session expired. Please log in again.");
        setProcessing(false);
        return;
      }

      const apiUrl = `${
        import.meta.env.VITE_SUPABASE_URL
      }/functions/v1/create-user`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
          phone: newUser.phone,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("Failed to create user: " + (result.error || "Unknown error"));
        setProcessing(false);
        return;
      }

      setNewUser({
        email: "",
        password: "",
        full_name: "",
        role: "worker",
        phone: "",
      });
      setShowNewModal(false);
      setProcessing(false);
      loadUsers();
    } catch (error) {
      alert("Failed to create user: " + (error as Error).message);
      setProcessing(false);
    }
  };

  const openEditModal = (user: Profile) => {
    setEditUser({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role as "admin" | "site_manager" | "worker",
      phone: user.phone || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        alert("Session expired. Please log in again.");
        setProcessing(false);
        return;
      }

      const apiUrl = `${
        import.meta.env.VITE_SUPABASE_URL
      }/functions/v1/update-user`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: editUser.id,
          email: editUser.email,
          full_name: editUser.full_name,
          role: editUser.role,
          phone: editUser.phone,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("Failed to update user: " + (result.error || "Unknown error"));
        setProcessing(false);
        return;
      }

      setEditUser({
        id: "",
        email: "",
        full_name: "",
        role: "worker",
        phone: "",
      });
      setShowEditModal(false);
      setProcessing(false);
      loadUsers();
    } catch (error) {
      alert("Failed to update user: " + (error as Error).message);
      setProcessing(false);
    }
  };

  const openDeleteDialog = (id: string, userName: string) => {
    setDeleteDialog({ isOpen: true, userId: id, userName });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, userId: "", userName: "" });
    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        alert("Session expired. Please log in again.");
        closeDeleteDialog();
        return;
      }

      const apiUrl = `${
        import.meta.env.VITE_SUPABASE_URL
      }/functions/v1/delete-user`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: deleteDialog.userId,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("Failed to delete user: " + (result.error || "Unknown error"));
        closeDeleteDialog();
        return;
      }

      closeDeleteDialog();
      loadUsers();
    } catch (error) {
      alert("Failed to delete user: " + (error as Error).message);
      closeDeleteDialog();
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage admins, site managers, and workers
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add User</span>
          </button>
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
              No Users Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Add your first user to get started.
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Add First User</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 group hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`bg-gradient-to-r ${getRoleColor(
                      user.role
                    )} p-3 rounded-lg`}
                  >
                    {getRoleIcon(user.role)}
                  </div>
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openDeleteDialog(user.id, user.full_name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {user.full_name}
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{user.email}</p>
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

      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Add New User
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      role: e.target.value as "admin" | "site_manager" | "worker",
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                >
                  <option value="worker">Worker</option>
                  <option value="site_manager">Site Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, full_name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 6 characters
                </p>
              </div>
              {newUser.role === "worker" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) =>
                      setNewUser({ ...newUser, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  />
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  The user will be able to login with their email and password.
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewModal(false);
                    setNewUser({
                      email: "",
                      password: "",
                      full_name: "",
                      role: "worker",
                      phone: "",
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Edit User
            </h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={editUser.role}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      role: e.target.value as "admin" | "site_manager" | "worker",
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                >
                  <option value="worker">Worker</option>
                  <option value="site_manager">Site Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editUser.full_name}
                  onChange={(e) =>
                    setEditUser({ ...editUser, full_name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) =>
                    setEditUser({ ...editUser, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                />
              </div>
              {editUser.role === "worker" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={editUser.phone}
                    onChange={(e) =>
                      setEditUser({ ...editUser, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  />
                </div>
              )}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditUser({
                      id: "",
                      email: "",
                      full_name: "",
                      role: "worker",
                      phone: "",
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Updating..." : "Update User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteDialog.userName}? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        cancelLabel="No, Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteDialog}
        isProcessing={isDeleting}
      />
    </Layout>
  );
}
