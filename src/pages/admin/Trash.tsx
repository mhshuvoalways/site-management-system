import { Building, Package, RotateCcw, Trash2, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Layout } from "../../components/Layout";
import { supabase } from "../../integrations/supabase/client";
import { capitalizeWords } from "../../utils/capitalize";

type Tab = "sites" | "items" | "users" | "site_items";

interface TrashedSite {
  id: string;
  name: string;
  location: string | null;
  deleted_at: string;
}

interface TrashedItem {
  id: string;
  name: string;
  item_type: string;
  quantity: number;
  deleted_at: string;
}

interface TrashedUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  deleted_at: string;
}

interface TrashedSiteItem {
  id: string;
  quantity: number | null;
  deleted_at: string;
  deleted_by: string | null;
  item: { name: string; item_type: string } | null;
  site: { name: string } | null;
  deleted_by_profile: { full_name: string } | null;
}

export function AdminTrash() {
  const [activeTab, setActiveTab] = useState<Tab>("sites");
  const [trashedSites, setTrashedSites] = useState<TrashedSite[]>([]);
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([]);
  const [trashedSiteItems, setTrashedSiteItems] = useState<TrashedSiteItem[]>([]);
  const [trashedUsers, setTrashedUsers] = useState<TrashedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [emptyDialog, setEmptyDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: Tab;
    id: string;
    name: string;
  }>({ isOpen: false, type: "sites", id: "", name: "" });

  useEffect(() => {
    loadTrashed();
  }, []);

  const loadTrashed = async () => {
    const [sitesRes, itemsRes, siteItemsRes, usersRes] = await Promise.all([
      supabase.from("sites").select("id, name, location, deleted_at").not("deleted_at", "is", null),
      supabase.from("items").select("id, name, item_type, quantity, deleted_at").not("deleted_at", "is", null),
      supabase.from("site_items").select("id, quantity, deleted_at, deleted_by, item:items(name, item_type), site:sites(name), deleted_by_profile:profiles!site_items_deleted_by_fkey(full_name)").not("deleted_at", "is", null),
      supabase.from("profiles").select("id, full_name, email, role, deleted_at").not("deleted_at", "is", null),
    ]);

    setTrashedSites((sitesRes.data as TrashedSite[]) || []);
    setTrashedItems((itemsRes.data as TrashedItem[]) || []);
    setTrashedSiteItems((siteItemsRes.data as any[]) || []);
    setTrashedUsers((usersRes.data as TrashedUser[]) || []);
    setLoading(false);
  };

  const totalCount = trashedSites.length + trashedItems.length + trashedSiteItems.length + trashedUsers.length;

  const handleRestore = async (type: Tab, id: string) => {
    setProcessing(true);
    const table = type === "sites" ? "sites" : type === "items" ? "items" : type === "site_items" ? "site_items" : "profiles";
    await supabase.from(table).update({ deleted_at: null, ...(type === "site_items" ? { deleted_by: null } : {}) }).eq("id", id);
    await loadTrashed();
    setProcessing(false);
  };

  const handlePermanentDelete = async () => {
    setProcessing(true);
    const { type, id } = deleteDialog;

    if (type === "users") {
      // Call delete-user edge function for permanent user deletion
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
          await fetch(apiUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: id }),
          });
        }
      } catch (e) {
        console.error("Failed to permanently delete user:", e);
      }
    } else {
      const table = type === "sites" ? "sites" : type === "items" ? "items" : "site_items";
      await supabase.from(table).delete().eq("id", id);
    }

    setDeleteDialog({ isOpen: false, type: "sites", id: "", name: "" });
    await loadTrashed();
    setProcessing(false);
  };

  const handleEmptyAll = async () => {
    setProcessing(true);

    // Delete sites and items permanently
    const siteIds = trashedSites.map((s) => s.id);
    const itemIds = trashedItems.map((i) => i.id);
    const siteItemIds = trashedSiteItems.map((si) => si.id);
    const userIds = trashedUsers.map((u) => u.id);

    if (siteIds.length > 0) {
      await supabase.from("sites").delete().in("id", siteIds);
    }
    if (itemIds.length > 0) {
      await supabase.from("items").delete().in("id", itemIds);
    }
    if (siteItemIds.length > 0) {
      await supabase.from("site_items").delete().in("id", siteItemIds);
    }

    // Delete users via edge function
    if (userIds.length > 0) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
          for (const userId of userIds) {
            await fetch(apiUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ userId }),
            });
          }
        }
      } catch (e) {
        console.error("Failed to permanently delete users:", e);
      }
    }

    setEmptyDialog(false);
    await loadTrashed();
    setProcessing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tabs: { key: Tab; label: string; icon: typeof Building; count: number }[] = [
    { key: "sites", label: "Sites", icon: Building, count: trashedSites.length },
    { key: "items", label: "Items", icon: Package, count: trashedItems.length },
    { key: "site_items", label: "Site Items", icon: Package, count: trashedSiteItems.length },
    { key: "users", label: "Users", icon: Users, count: trashedUsers.length },
  ];

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
            <h1 className="text-3xl font-bold text-gray-900">Trash</h1>
            <p className="text-gray-600 mt-1">
              {totalCount === 0
                ? "Trash is empty"
                : `${totalCount} item${totalCount !== 1 ? "s" : ""} in trash`}
            </p>
          </div>
          {totalCount > 0 && (
            <button
              onClick={() => setEmptyDialog(true)}
              disabled={processing}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
              <span>Empty All Trash</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === "sites" && (
          <TrashList
            items={trashedSites}
            emptyMessage="No sites in trash"
            emptyIcon={Building}
            renderItem={(site) => (
              <TrashCard
                key={site.id}
                icon={<Building className="w-5 h-5 text-white" />}
                iconBg="from-blue-500 to-blue-600"
                title={capitalizeWords(site.name)}
                subtitle={site.location ? capitalizeWords(site.location) : "No location"}
                deletedAt={formatDate(site.deleted_at)}
                onRestore={() => handleRestore("sites", site.id)}
                onDelete={() =>
                  setDeleteDialog({ isOpen: true, type: "sites", id: site.id, name: site.name })
                }
                disabled={processing}
              />
            )}
          />
        )}

        {activeTab === "items" && (
          <TrashList
            items={trashedItems}
            emptyMessage="No items in trash"
            emptyIcon={Package}
            renderItem={(item) => (
              <TrashCard
                key={item.id}
                icon={<Package className="w-5 h-5 text-white" />}
                iconBg={item.item_type === "equipment" ? "from-[#0db2ad] to-teal-600" : "from-[#567fca] to-purple-600"}
                title={capitalizeWords(item.name)}
                subtitle={`${capitalizeWords(item.item_type)} · Qty: ${item.quantity}`}
                deletedAt={formatDate(item.deleted_at)}
                onRestore={() => handleRestore("items", item.id)}
                onDelete={() =>
                  setDeleteDialog({ isOpen: true, type: "items", id: item.id, name: item.name })
                }
                disabled={processing}
              />
            )}
          />
        )}

        {activeTab === "site_items" && (
          <TrashList
            items={trashedSiteItems}
            emptyMessage="No site items in trash"
            emptyIcon={Package}
            renderItem={(siteItem) => (
              <TrashCard
                key={siteItem.id}
                icon={<Package className="w-5 h-5 text-white" />}
                iconBg={siteItem.item?.item_type === "equipment" ? "from-blue-500 to-blue-600" : "from-green-500 to-green-600"}
                title={capitalizeWords(siteItem.item?.name) || "Unknown Item"}
                subtitle={`Site: ${capitalizeWords(siteItem.site?.name) || "Unknown"} · Qty: ${siteItem.quantity ?? 0} · By: ${capitalizeWords(siteItem.deleted_by_profile?.full_name) || "Unknown"}`}
                deletedAt={formatDate(siteItem.deleted_at)}
                onRestore={() => handleRestore("site_items", siteItem.id)}
                onDelete={() =>
                  setDeleteDialog({
                    isOpen: true,
                    type: "site_items",
                    id: siteItem.id,
                    name: siteItem.item?.name || "Site Item",
                  })
                }
                disabled={processing}
              />
            )}
          />
        )}

        {activeTab === "users" && (
          <TrashList
            items={trashedUsers}
            emptyMessage="No users in trash"
            emptyIcon={Users}
            renderItem={(user) => (
              <TrashCard
                key={user.id}
                icon={<Users className="w-5 h-5 text-white" />}
                iconBg={
                  user.role === "admin"
                    ? "from-red-500 to-red-600"
                    : user.role === "site_manager"
                    ? "from-[#0db2ad] to-[#567fca]"
                    : "from-orange-500 to-orange-600"
                }
                title={capitalizeWords(user.full_name)}
                subtitle={`${user.email} · ${user.role === "site_manager" ? "Site Manager" : capitalizeWords(user.role)}`}
                deletedAt={formatDate(user.deleted_at)}
                onRestore={() => handleRestore("users", user.id)}
                onDelete={() =>
                  setDeleteDialog({
                    isOpen: true,
                    type: "users",
                    id: user.id,
                    name: user.full_name,
                  })
                }
                disabled={processing}
              />
            )}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Forever?"
        message={`"${deleteDialog.name}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Forever"
        onConfirm={handlePermanentDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, type: "sites", id: "", name: "" })}
        isProcessing={processing}
      />

      <ConfirmDialog
        isOpen={emptyDialog}
        title="Empty All Trash?"
        message={`All ${totalCount} trashed item${totalCount !== 1 ? "s" : ""} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Empty Trash"
        onConfirm={handleEmptyAll}
        onCancel={() => setEmptyDialog(false)}
        isProcessing={processing}
      />
    </Layout>
  );
}

function TrashList<T>({
  items,
  emptyMessage,
  emptyIcon: Icon,
  renderItem,
}: {
  items: T[];
  emptyMessage: string;
  emptyIcon: typeof Building;
  renderItem: (item: T) => React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
        <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(renderItem)}
    </div>
  );
}

function TrashCard({
  icon,
  iconBg,
  title,
  subtitle,
  deletedAt,
  onRestore,
  onDelete,
  disabled,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  deletedAt: string;
  onRestore: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 opacity-75 hover:opacity-100 transition">
      <div className="flex items-start justify-between mb-3">
        <div className={`bg-gradient-to-br ${iconBg} p-2.5 rounded-lg`}>{icon}</div>
        <span className="text-xs text-gray-400">Deleted {deletedAt}</span>
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
      <div className="flex space-x-2">
        <button
          onClick={onRestore}
          disabled={disabled}
          className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Restore</span>
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          <span>Delete Forever</span>
        </button>
      </div>
    </div>
  );
}
