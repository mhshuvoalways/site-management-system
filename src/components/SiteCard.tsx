import { Building, MapPin, Edit, Trash2, Package, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Site } from "../types";
import { capitalizeWords } from "../utils/capitalize";
import { useLazyLoadSiteItems } from "../hooks/useLazyLoadSiteItems";

interface SiteCardProps {
  site: Site;
  linkPrefix: string;
  itemSearchTerm?: string;
  onEdit?: (site: Site) => void;
  onDelete?: (id: string, name: string) => void;
  showActions?: boolean;
}

export function SiteCard({
  site,
  linkPrefix,
  itemSearchTerm = "",
  onEdit,
  onDelete,
  showActions = false,
}: SiteCardProps) {
  const { items, loading, containerRef } = useLazyLoadSiteItems(site.id);

  // Highlight matching text in item names
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;

    const regex = new RegExp(
      `(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span
          key={index}
          className="bg-yellow-300 text-yellow-900 font-semibold rounded px-0.5"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Sort items so matches appear first
  const sortedItems = items.slice().sort((a, b) => {
    if (!itemSearchTerm.trim()) return 0;
    const aMatch = a.item?.name
      ?.toLowerCase()
      .includes(itemSearchTerm.toLowerCase());
    const bMatch = b.item?.name
      ?.toLowerCase()
      .includes(itemSearchTerm.toLowerCase());
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="bg-gradient-to-br from-[#0db2ad] to-[#567fca] p-3 rounded-lg">
            <Building className="w-6 h-6 text-white" />
          </div>
          {showActions && (
            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
              {onEdit && (
                <button
                  onClick={() => onEdit(site)}
                  className="p-2 text-[#0db2ad] hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(site.id, site.name)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          {!showActions && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              Active
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {capitalizeWords(site.name)}
        </h3>
        <div className="flex items-center space-x-2 text-gray-600 text-sm mb-3">
          <MapPin className="w-4 h-4" />
          <span>{capitalizeWords(site.location)}</span>
        </div>
        {site.description && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-4">
            {site.description}
          </p>
        )}

        {/* Assigned Items Section */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Assigned Items {!loading && `(${items.length})`}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              <span className="ml-2 text-sm text-gray-400">Loading items...</span>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No items assigned</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {sortedItems.map((siteItem) => {
                const itemName = capitalizeWords(
                  siteItem.item?.name || "Unknown"
                );
                const isMatch =
                  itemSearchTerm.trim() &&
                  siteItem.item?.name
                    ?.toLowerCase()
                    .includes(itemSearchTerm.toLowerCase());

                return (
                  <div
                    key={siteItem.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      isMatch
                        ? "bg-yellow-50 border border-yellow-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <span className="text-gray-700 truncate flex-1">
                      {highlightText(itemName, itemSearchTerm)}
                    </span>
                    <span className="text-gray-500 font-medium ml-2">
                      x{siteItem.quantity ?? 0}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <Link
          to={`${linkPrefix}/${site.id}`}
          className="text-[#0db2ad] hover:text-[#567fca] font-medium text-sm transition"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
