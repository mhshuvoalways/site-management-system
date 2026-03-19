import { Clock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { capitalizeWords } from "../utils/capitalize";

interface Transfer {
  id: string;
  item_id: string;
  from_site_id: string | null;
  to_site_id: string | null;
  quantity: number;
  created_at: string | null;
  from_site?: { name: string } | null;
  to_site?: { name: string } | null;
  transferred_by_profile?: { full_name: string } | null;
}

interface EquipmentHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
}

type ViewMode = "weekly" | "monthly";

function groupByPeriod(transfers: Transfer[], mode: ViewMode) {
  const groups: Record<string, Transfer[]> = {};

  for (const t of transfers) {
    if (!t.created_at) continue;
    const date = new Date(t.created_at);
    let key: string;

    if (mode === "monthly") {
      key = date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    } else {
      // Weekly: use ISO week start (Monday)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(date);
      weekStart.setDate(diff);
      key = `Week of ${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  return groups;
}

export function EquipmentHistory({ isOpen, onClose, itemId, itemName }: EquipmentHistoryProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");

  useEffect(() => {
    if (isOpen && itemId) {
      loadHistory();
    }
  }, [isOpen, itemId]);

  const loadHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("transfers")
      .select("*, from_site:sites!transfers_from_site_id_fkey(name), to_site:sites!transfers_to_site_id_fkey(name), transferred_by_profile:profiles!transfers_transferred_by_fkey(full_name)")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false });

    setTransfers((data as unknown as Transfer[]) || []);
    setLoading(false);
  };

  if (!isOpen) return null;

  const grouped = groupByPeriod(transfers, viewMode);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Equipment History</h2>
            <p className="text-sm text-gray-600">{capitalizeWords(itemName)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex items-center space-x-2">
          <button
            onClick={() => setViewMode("weekly")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              viewMode === "weekly"
                ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              viewMode === "monthly"
                ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Monthly
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0db2ad]"></div>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No transfer history for this item.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([period, items]) => (
                <div key={period}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    {period}
                  </h3>
                  <div className="space-y-2">
                    {items.map((t) => (
                      <div
                        key={t.id}
                        className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">
                              {t.from_site ? capitalizeWords(t.from_site.name) : "Storage"}
                            </span>
                            {" → "}
                            <span className="font-medium">
                              {t.to_site ? capitalizeWords(t.to_site.name) : "Storage"}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500">
                            {t.created_at
                              ? new Date(t.created_at).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                            {t.transferred_by_profile &&
                              ` • by ${t.transferred_by_profile.full_name}`}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          ×{t.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
