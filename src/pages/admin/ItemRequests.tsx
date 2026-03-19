import { Check, Filter, Package, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import { capitalizeWords } from "../../utils/capitalize";

interface ItemRequest {
  id: string;
  item_id: string;
  requested_by: string;
  quantity: number;
  status: string;
  reviewed_by: string | null;
  notes: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  item?: { name: string; item_type: string; quantity: number; photo_url: string | null };
  requester?: { full_name: string; email: string };
}

export function ItemRequestsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "declined">("pending");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    let query = supabase
      .from("item_requests")
      .select("*, item:items(name, item_type, quantity, photo_url), requester:profiles!item_requests_requested_by_fkey(full_name, email)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setRequests((data as unknown as ItemRequest[]) || []);
    setLoading(false);
  };

  const handleAction = async (requestId: string, action: "approved" | "declined") => {
    if (!profile) return;
    setProcessing(requestId);

    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    if (action === "approved" && request.item) {
      // Increase the item's quantity in the Product Database
      await supabase
        .from("items")
        .update({ quantity: request.item.quantity + request.quantity })
        .eq("id", request.item_id);
    }

    await supabase
      .from("item_requests")
      .update({
        status: action,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    setProcessing(null);
    loadRequests();
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
          <h1 className="text-3xl font-bold text-gray-900">Item Requests</h1>
          <p className="text-gray-600 mt-1">
            Review and approve stock increase requests from site managers
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-2 border border-gray-100">
          <Filter className="w-5 h-5 text-gray-400 ml-2" />
          {(["all", "pending", "approved", "declined"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                filter === f
                  ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Requests</h3>
            <p className="text-gray-600">
              {filter === "pending"
                ? "No pending requests at the moment."
                : `No ${filter} requests found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {req.item?.photo_url ? (
                      <img
                        src={req.item.photo_url}
                        alt={req.item.name}
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <Package className="w-7 h-7" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {capitalizeWords(req.item?.name)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Requested by{" "}
                        <span className="font-medium">
                          {req.requester?.full_name || req.requester?.email}
                        </span>
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                          +{req.quantity} units
                        </span>
                        <span className="text-sm text-gray-500">
                          Current stock: {req.item?.quantity ?? 0}
                        </span>
                      </div>
                      {req.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          "{req.notes}"
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {req.created_at
                          ? new Date(req.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {req.status === "pending" ? (
                      <>
                        <button
                          onClick={() => handleAction(req.id, "approved")}
                          disabled={processing === req.id}
                          className="inline-flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "declined")}
                          disabled={processing === req.id}
                          className="inline-flex items-center space-x-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          <span>Decline</span>
                        </button>
                      </>
                    ) : (
                      <span
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                          req.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {req.status === "approved" ? "Approved" : "Declined"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
