import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  FileText,
  Minus,
  Package,
  Plus,
  Search,
  Square,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import { Item, Site, SiteItem } from "../../types";
import { capitalizeWords } from "../../utils/capitalize";

export function SiteManagerSiteDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [site, setSite] = useState<Site | null>(null);
  const [siteItems, setSiteItems] = useState<SiteItem[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addItemType, setAddItemType] = useState<"equipment" | "material">("equipment");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReduceModal, setShowReduceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [currentSiteItem, setCurrentSiteItem] = useState<SiteItem | null>(null);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("");
  const [materialsSearchTerm, setMaterialsSearchTerm] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [targetSiteId, setTargetSiteId] = useState("");
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkTransferModal, setShowBulkTransferModal] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    const [siteData, siteItemsData, itemsData, sitesData] = await Promise.all([
      supabase.from("sites").select("*").eq("id", id).single(),
      supabase.from("site_items").select("*, item:items(*)").eq("site_id", id).is("deleted_at", null),
      supabase.from("items").select("*").is("deleted_at", null).order("name"),
      supabase.from("sites").select("*").neq("id", id).order("name"),
    ]);

    setSite(siteData.data);
    setSiteItems(siteItemsData.data || []);
    setAllItems(itemsData.data || []);
    setSites(sitesData.data || []);
    setLoading(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedItem) return;

    const finalQuantity = addItemType === "material" ? 1 : quantity;
    if (addItemType === "equipment" && finalQuantity <= 0) { alert("Quantity must be greater than 0"); return; }

    try {
      const { data: existing, error: selectError } = await supabase
        .from("site_items")
        .select("*")
        .eq("site_id", id)
        .eq("item_id", selectedItem)
        .maybeSingle();

      if (selectError) {
        console.error("Error checking existing item:", selectError);
        alert(`Error: ${selectError.message}`);
        return;
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from("site_items")
          .update({ quantity: (existing.quantity ?? 0) + finalQuantity, deleted_at: null, deleted_by: null })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Error updating item:", updateError);
          alert(`Error updating item: ${updateError.message}`);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("site_items")
          .insert({ site_id: id, item_id: selectedItem, quantity: finalQuantity });

        if (insertError) {
          console.error("Error inserting item:", insertError);
          alert(`Error adding item: ${insertError.message}`);
          return;
        }
      }

      setShowAddModal(false);
      setSelectedItem("");
      setItemSearchTerm("");
      setShowItemDropdown(false);
      setQuantity(1);
      loadData();
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred");
    }
  };

  const filteredItems = allItems.filter((item) =>
    item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) &&
    item.item_type === addItemType
  );

  const selectedItemData = allItems.find((item) => item.id === selectedItem);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !currentSiteItem || !targetSiteId || !profile) return;
    const maxQty = currentSiteItem.quantity ?? 0;
    if (quantity <= 0) { alert("Quantity must be greater than 0"); return; }
    if (quantity > maxQty) { alert(`Cannot exceed available quantity of ${maxQty}`); return; }

    await supabase.from("transfers").insert({
      item_id: currentSiteItem.item_id,
      from_site_id: id,
      to_site_id: targetSiteId,
      quantity,
      transferred_by: profile.id,
    });

    const newQuantity = (currentSiteItem.quantity ?? 0) - quantity;
    if (newQuantity === 0) {
      await supabase.from("site_items").delete().eq("id", currentSiteItem.id);
    } else {
      await supabase
        .from("site_items")
        .update({ quantity: newQuantity })
        .eq("id", currentSiteItem.id);
    }

    const { data: targetItem } = await supabase
      .from("site_items")
      .select("*")
      .eq("site_id", targetSiteId)
      .eq("item_id", currentSiteItem.item_id)
      .maybeSingle();

    if (targetItem) {
      await supabase
        .from("site_items")
        .update({ quantity: (targetItem.quantity ?? 0) + quantity })
        .eq("id", targetItem.id);
    } else {
      await supabase.from("site_items").insert({
        site_id: targetSiteId,
        item_id: currentSiteItem.item_id,
        quantity,
      });
    }

    setShowTransferModal(false);
    setCurrentSiteItem(null);
    setTargetSiteId("");
    setQuantity(1);
    loadData();
  };

  const handleReduce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSiteItem) return;
    const maxQty = currentSiteItem.quantity ?? 0;
    if (quantity <= 0) { alert("Quantity must be greater than 0"); return; }
    if (quantity > maxQty) { alert(`Cannot exceed current quantity of ${maxQty}`); return; }

    const newQuantity = (currentSiteItem.quantity ?? 0) - quantity;
    if (newQuantity <= 0) {
      await supabase.from("site_items").delete().eq("id", currentSiteItem.id);
    } else {
      await supabase
        .from("site_items")
        .update({ quantity: newQuantity })
        .eq("id", currentSiteItem.id);
    }

    setShowReduceModal(false);
    setCurrentSiteItem(null);
    setQuantity(1);
    loadData();
  };

  const openDeleteModal = (siteItem: SiteItem) => {
    setCurrentSiteItem(siteItem);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!currentSiteItem || !profile) return;

    await supabase.from("site_items").update({ deleted_at: new Date().toISOString(), deleted_by: profile.id }).eq("id", currentSiteItem.id);

    setShowDeleteModal(false);
    setCurrentSiteItem(null);
    loadData();
  };

  // Multi-select helpers
  const toggleEquipmentSelection = (id: string) => {
    setSelectedEquipmentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleMaterialSelection = (id: string) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelectedIds = [...selectedEquipmentIds, ...selectedMaterialIds];
  const totalSelected = allSelectedIds.length;

  const handleBulkDelete = async () => {
    if (!profile) return;
    setBulkProcessing(true);
    for (const itemId of allSelectedIds) {
      await supabase.from("site_items").update({ deleted_at: new Date().toISOString(), deleted_by: profile.id }).eq("id", itemId);
    }
    setSelectedEquipmentIds(new Set());
    setSelectedMaterialIds(new Set());
    setShowBulkDeleteDialog(false);
    setBulkProcessing(false);
    loadData();
  };

  const handleBulkTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !targetSiteId || !profile) return;
    setBulkProcessing(true);

    const selectedSiteItems = siteItems.filter(si => allSelectedIds.includes(si.id));

    for (const si of selectedSiteItems) {
      const transferQty = si.quantity ?? 0;
      if (transferQty <= 0) continue;

      await supabase.from("transfers").insert({
        item_id: si.item_id,
        from_site_id: id,
        to_site_id: targetSiteId,
        quantity: transferQty,
        transferred_by: profile.id,
      });

      await supabase.from("site_items").delete().eq("id", si.id);

      const { data: targetItem } = await supabase
        .from("site_items")
        .select("*")
        .eq("site_id", targetSiteId)
        .eq("item_id", si.item_id)
        .maybeSingle();

      if (targetItem) {
        await supabase.from("site_items").update({ quantity: (targetItem.quantity ?? 0) + transferQty }).eq("id", targetItem.id);
      } else {
        await supabase.from("site_items").insert({ site_id: targetSiteId, item_id: si.item_id, quantity: transferQty });
      }
    }

    setSelectedEquipmentIds(new Set());
    setSelectedMaterialIds(new Set());
    setShowBulkTransferModal(false);
    setTargetSiteId("");
    setBulkProcessing(false);
    loadData();
  };

  const openAddModal = (type: "equipment" | "material") => {
    setAddItemType(type);
    setShowAddModal(true);
    setItemSearchTerm("");
    setSelectedItem("");
    setShowItemDropdown(false);
    setQuantity(1);
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

  const equipment = siteItems.filter(
    (si) =>
      si.item?.item_type === "equipment" &&
      (equipmentSearchTerm === "" ||
        si.item?.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase()))
  );
  const materials = siteItems.filter(
    (si) =>
      si.item?.item_type === "material" &&
      (materialsSearchTerm === "" ||
        si.item?.name.toLowerCase().includes(materialsSearchTerm.toLowerCase()))
  );

  const selectAllEquipment = () => {
    if (selectedEquipmentIds.size === equipment.length) {
      setSelectedEquipmentIds(new Set());
    } else {
      setSelectedEquipmentIds(new Set(equipment.map(e => e.id)));
    }
  };

  const selectAllMaterials = () => {
    if (selectedMaterialIds.size === materials.length) {
      setSelectedMaterialIds(new Set());
    } else {
      setSelectedMaterialIds(new Set(materials.map(m => m.id)));
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link
            to="/site-manager/sites"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{capitalizeWords(site.name)}</h1>
            <p className="text-gray-600 mt-1">{capitalizeWords(site.location)}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => openAddModal("equipment")}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Add Equipment</span>
            </button>
            <button
              onClick={() => openAddModal("material")}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Add Material</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to={`/site-manager/sites/${id}/workers`}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Workers</h3>
                  <p className="text-sm text-gray-600">
                    Assign and manage workers
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
            </div>
          </Link>

          <Link
            to={`/site-manager/sites/${id}/building-control`}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-[#0db2ad] to-[#567fca] p-3 rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Building Control
                  </h3>
                  <p className="text-sm text-gray-600">
                    Manage reports and inspections
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#0db2ad] transition" />
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equipment Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Equipment</h2>
              {equipment.length > 0 && (
                <button onClick={selectAllEquipment} className="text-white/80 hover:text-white text-sm font-medium">
                  {selectedEquipmentIds.size === equipment.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
            <div className="px-6 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search equipment..."
                  value={equipmentSearchTerm}
                  onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="p-6 pt-4 max-h-[440px] overflow-y-auto">
              {equipment.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No equipment yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {equipment.map((siteItem) => (
                    <div
                      key={siteItem.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition ${selectedEquipmentIds.has(siteItem.id) ? "bg-blue-50 border border-blue-200" : "bg-gray-50"}`}
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleEquipmentSelection(siteItem.id)}
                          className="text-gray-400 hover:text-blue-600 transition"
                        >
                          {selectedEquipmentIds.has(siteItem.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        {siteItem.item?.photo_url ? (
                          <img
                            src={siteItem.item.photo_url}
                            alt={siteItem.item.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {capitalizeWords(siteItem.item?.name)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Qty: {siteItem.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setCurrentSiteItem(siteItem);
                            setQuantity(1);
                            setShowTransferModal(true);
                          }}
                          className="p-2 text-[#0db2ad] hover:bg-blue-100 rounded-lg transition"
                          title="Transfer"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentSiteItem(siteItem);
                            setQuantity(1);
                            setShowReduceModal(true);
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                          title="Reduce"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(siteItem)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Materials Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Materials</h2>
              {materials.length > 0 && (
                <button onClick={selectAllMaterials} className="text-white/80 hover:text-white text-sm font-medium">
                  {selectedMaterialIds.size === materials.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
            <div className="px-6 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={materialsSearchTerm}
                  onChange={(e) => setMaterialsSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="p-6 pt-4 max-h-[440px] overflow-y-auto">
              {materials.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No materials yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materials.map((siteItem) => (
                    <div
                      key={siteItem.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition ${selectedMaterialIds.has(siteItem.id) ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleMaterialSelection(siteItem.id)}
                          className="text-gray-400 hover:text-green-600 transition"
                        >
                          {selectedMaterialIds.has(siteItem.id) ? (
                            <CheckSquare className="w-5 h-5 text-green-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        {siteItem.item?.photo_url ? (
                          <img
                            src={siteItem.item.photo_url}
                            alt={siteItem.item.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <p className="font-medium text-gray-900">
                          {capitalizeWords(siteItem.item?.name)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setCurrentSiteItem(siteItem);
                            setQuantity(1);
                            setShowTransferModal(true);
                          }}
                          className="p-2 text-[#0db2ad] hover:bg-green-100 rounded-lg transition"
                          title="Transfer"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(siteItem)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating bulk action bar */}
      {totalSelected > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-4 z-40">
          <span className="text-sm font-medium">{totalSelected} item{totalSelected !== 1 ? "s" : ""} selected</span>
          <button
            onClick={() => { setTargetSiteId(""); setShowBulkTransferModal(true); }}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#0db2ad] rounded-lg hover:bg-[#0a9e99] transition text-sm font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Transfer</span>
          </button>
          <button
            onClick={() => setShowBulkDeleteDialog(true)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-600 rounded-lg hover:bg-red-700 transition text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
          <button
            onClick={() => { setSelectedEquipmentIds(new Set()); setSelectedMaterialIds(new Set()); }}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowItemDropdown(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Add {addItemType === "equipment" ? "Equipment" : "Material"} to Site
            </h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select {addItemType === "equipment" ? "Equipment" : "Material"}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                  <input
                    type="text"
                    placeholder={`Search ${addItemType}...`}
                    value={
                      selectedItemData
                        ? capitalizeWords(selectedItemData.name)
                        : itemSearchTerm
                    }
                    onChange={(e) => {
                      setItemSearchTerm(e.target.value);
                      setSelectedItem("");
                      setShowItemDropdown(true);
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                    required={!selectedItem}
                  />
                </div>
                {showItemDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No {addItemType} found
                      </div>
                    ) : (
                      filteredItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedItem(item.id);
                            setItemSearchTerm("");
                            setShowItemDropdown(false);
                            setQuantity(1);
                          }}
                          className={`w-full text-left px-4 py-3 transition flex items-center space-x-3 hover:bg-gray-50 ${selectedItem === item.id ? "bg-blue-50" : ""}`}
                        >
                          {item.photo_url ? (
                            <img
                              src={item.photo_url}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="bg-gray-100 p-2 rounded-lg">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {capitalizeWords(item.name)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {capitalizeWords(item.item_type)}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {addItemType === "equipment" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setQuantity(val === '' ? 0 : parseInt(val, 10));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                    required
                  />
                </div>
              )}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setItemSearchTerm("");
                    setShowItemDropdown(false);
                    setSelectedItem("");
                    setQuantity(1);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedItem}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add {addItemType === "equipment" ? "Equipment" : "Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && currentSiteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Transfer Item
            </h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Transferring</p>
                <p className="text-lg font-bold text-gray-900">
                  {capitalizeWords(currentSiteItem.item?.name)}
                </p>
                {currentSiteItem.item?.item_type === "equipment" && (
                  <p className="text-sm text-gray-600">
                    Available: {currentSiteItem.quantity}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination Site
                </label>
                <select
                  value={targetSiteId}
                  onChange={(e) => setTargetSiteId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                >
                  <option value="">Choose a site...</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {capitalizeWords(s.name)}
                    </option>
                  ))}
                </select>
              </div>
              {currentSiteItem.item?.item_type === "equipment" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity to Transfer
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setQuantity(val === '' ? 0 : parseInt(val, 10));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                    required
                  />
                  {quantity > (currentSiteItem.quantity ?? 0) && (
                    <p className="text-sm text-red-600 mt-1">Cannot exceed available quantity of {currentSiteItem.quantity}</p>
                  )}
                </div>
              )}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    setCurrentSiteItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
                >
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reduce Modal (equipment only) */}
      {showReduceModal && currentSiteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Reduce Quantity
            </h2>
            <form onSubmit={handleReduce} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Item</p>
                <p className="text-lg font-bold text-gray-900">
                  {capitalizeWords(currentSiteItem.item?.name)}
                </p>
                <p className="text-sm text-gray-600">
                  Current: {currentSiteItem.quantity}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Reduce
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setQuantity(val === '' ? 0 : parseInt(val, 10));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                />
                {quantity > (currentSiteItem.quantity ?? 0) && (
                  <p className="text-sm text-red-600 mt-1">Cannot exceed current quantity of {currentSiteItem.quantity}</p>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  Remaining: {(currentSiteItem.quantity ?? 0) - quantity}
                  {(currentSiteItem.quantity ?? 0) - quantity === 0 && (
                    <span className="text-red-600 font-medium">
                      {" "}
                      (Item will be removed)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowReduceModal(false);
                    setCurrentSiteItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Reduce
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Delete Modal */}
      {showDeleteModal && currentSiteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Delete Item
            </h2>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-800 mb-2">
                  Are you sure you want to delete this item?
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {capitalizeWords(currentSiteItem.item?.name)}
                </p>
                {currentSiteItem.item?.item_type === "equipment" && (
                  <p className="text-sm text-gray-600">
                    Quantity: {currentSiteItem.quantity}
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-600">
                This item will be moved to trash.
              </p>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCurrentSiteItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        isOpen={showBulkDeleteDialog}
        title="Delete Selected Items"
        message={`Are you sure you want to delete ${totalSelected} selected item${totalSelected !== 1 ? "s" : ""}? They will be moved to trash.`}
        confirmLabel="Delete All"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteDialog(false)}
        isProcessing={bulkProcessing}
      />

      {/* Bulk Transfer Modal */}
      {showBulkTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Transfer {totalSelected} Item{totalSelected !== 1 ? "s" : ""}
            </h2>
            <form onSubmit={handleBulkTransfer} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Items to transfer:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {siteItems.filter(si => allSelectedIds.includes(si.id)).map(si => (
                    <p key={si.id} className="text-sm font-medium text-gray-900">
                      {capitalizeWords(si.item?.name)} {si.item?.item_type === "equipment" ? `(Qty: ${si.quantity})` : ""}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination Site
                </label>
                <select
                  value={targetSiteId}
                  onChange={(e) => setTargetSiteId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                >
                  <option value="">Choose a site...</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {capitalizeWords(s.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkTransferModal(false)}
                  disabled={bulkProcessing}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkProcessing}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition disabled:opacity-50"
                >
                  {bulkProcessing ? "Transferring..." : "Transfer All"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
