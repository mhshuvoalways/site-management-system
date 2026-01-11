import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Filter,
  Image as ImageIcon,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Layout } from "../../components/Layout";
import { supabase } from "../../integrations/supabase/client";
import { Item } from "../../types";

const ITEMS_PER_PAGE = 10;

export function AdminStorage() {
  const [items, setItems] = useState<Item[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "equipment" | "material"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [materialCount, setMaterialCount] = useState(0);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [newItem, setNewItem] = useState<{
    name: string;
    item_type: "equipment" | "material";
    quantity: number;
  }>({
    name: "",
    item_type: "equipment",
    quantity: 0,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
  }>({
    isOpen: false,
    itemId: "",
    itemName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadItems();
    loadCounts();
  }, [filterType, currentPage, searchTerm]);

  const loadCounts = async () => {
    const [totalResult, equipmentResult, materialResult] = await Promise.all([
      supabase.from("items").select("*", { count: "exact", head: true }),
      supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("item_type", "equipment"),
      supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("item_type", "material"),
    ]);

    setTotalCount(totalResult.count || 0);
    setEquipmentCount(equipmentResult.count || 0);
    setMaterialCount(materialResult.count || 0);
  };

  const loadItems = async () => {
    setSearching(true);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase.from("items").select("*").order("name");

    if (filterType !== "all") {
      query = query.eq("item_type", filterType);
    }

    if (searchTerm) {
      query = query.ilike("name", `%${searchTerm}%`);
    }

    const { data } = await query.range(from, to);

    setItems(data || []);
    setSearching(false);
    setInitialLoading(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()
        .toString(36)
        .substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("item-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("item-photos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading photo:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();

    let photoUrl = null;
    if (photoFile) {
      photoUrl = await uploadPhoto(photoFile);
    }

    const { error } = await supabase
      .from("items")
      .insert({ ...newItem, photo_url: photoUrl });

    if (!error) {
      setNewItem({ name: "", item_type: "equipment", quantity: 0 });
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowNewItemModal(false);
      loadItems();
      loadCounts();
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;

    let photoUrl = currentItem.photo_url;
    if (photoFile) {
      photoUrl = await uploadPhoto(photoFile);
    }

    const { error } = await supabase
      .from("items")
      .update({
        name: currentItem.name,
        item_type: currentItem.item_type,
        quantity: currentItem.quantity,
        photo_url: photoUrl,
      })
      .eq("id", currentItem.id);

    if (!error) {
      setShowEditModal(false);
      setCurrentItem(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      loadItems();
      loadCounts();
    }
  };

  const openDeleteDialog = (id: string, name: string) => {
    setDeleteDialog({ isOpen: true, itemId: id, itemName: name });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, itemId: "", itemName: "" });
    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", deleteDialog.itemId);

    if (!error) {
      closeDeleteDialog();
      loadItems();
      loadCounts();
    } else {
      alert("Failed to delete item: " + error.message);
      closeDeleteDialog();
    }
  };

  const handleFilterChange = (type: "all" | "equipment" | "material") => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const openEditModal = (item: Item) => {
    setCurrentItem(item);
    setPhotoPreview(item.photo_url || null);
    setPhotoFile(null);
    setShowEditModal(true);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (initialLoading) {
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
              Product Database
            </h1>
            <p className="text-gray-600 mt-1">
              Master inventory of all equipment and materials (Admin only)
            </p>
          </div>
          <button
            onClick={() => setShowNewItemModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-2 border border-gray-100">
            <Filter className="w-5 h-5 text-gray-400 ml-2" />
            <button
              onClick={() => handleFilterChange("all")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === "all"
                  ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => handleFilterChange("equipment")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === "equipment"
                  ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Equipment ({equipmentCount})
            </button>
            <button
              onClick={() => handleFilterChange("material")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === "material"
                  ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Materials ({materialCount})
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search items by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0db2ad] border-t-transparent"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {items.length === 0 && !searching ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filterType === "all"
                ? "No Items Yet"
                : `No ${filterType} items yet`}
            </h3>
            <p className="text-gray-600 mb-6">
              Add your first item to the storage database.
            </p>
            <button
              onClick={() => setShowNewItemModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Add First Item</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Photo
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Item Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        {item.photo_url ? (
                          <img
                            src={item.photo_url}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-lg ${
                              item.item_type === "equipment"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            <Package className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-gray-900 capitalize">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            item.item_type === "equipment"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {item.item_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900 font-medium">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 text-[#0db2ad] hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(item.id, item.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {Math.min(
                    (currentPage - 1) * ITEMS_PER_PAGE + 1,
                    filterType === "all"
                      ? totalCount
                      : filterType === "equipment"
                      ? equipmentCount
                      : materialCount
                  )}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    filterType === "all"
                      ? totalCount
                      : filterType === "equipment"
                      ? equipmentCount
                      : materialCount
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium">
                  {filterType === "all"
                    ? totalCount
                    : filterType === "equipment"
                    ? equipmentCount
                    : materialCount}
                </span>{" "}
                items
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from(
                    {
                      length: Math.ceil(
                        (filterType === "all"
                          ? totalCount
                          : filterType === "equipment"
                          ? equipmentCount
                          : materialCount) / ITEMS_PER_PAGE
                      ),
                    },
                    (_, i) => i + 1
                  )
                    .filter(
                      (page) =>
                        page === 1 ||
                        page ===
                          Math.ceil(
                            (filterType === "all"
                              ? totalCount
                              : filterType === "equipment"
                              ? equipmentCount
                              : materialCount) / ITEMS_PER_PAGE
                          ) ||
                        Math.abs(page - currentPage) <= 1
                    )
                    .map((page, idx, arr) => (
                      <>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span
                            key={`ellipsis-${page}`}
                            className="px-2 text-gray-500"
                          >
                            ...
                          </span>
                        )}
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                            currentPage === page
                              ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {page}
                        </button>
                      </>
                    ))}
                </div>
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={
                    currentPage >=
                    Math.ceil(
                      (filterType === "all"
                        ? totalCount
                        : filterType === "equipment"
                        ? equipmentCount
                        : materialCount) / ITEMS_PER_PAGE
                    )
                  }
                  className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showNewItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Add New Item
            </h2>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo
                </label>
                <div className="space-y-3">
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#0db2ad] hover:bg-gray-50 transition">
                      <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Click to upload photo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={newItem.item_type}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      item_type: e.target.value as "equipment" | "material",
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                >
                  <option value="equipment">Equipment</option>
                  <option value="material">Material</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewItemModal(false);
                    clearPhoto();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && currentItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Item</h2>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo
                </label>
                <div className="space-y-3">
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#0db2ad] hover:bg-gray-50 transition">
                      <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Click to upload photo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name
                </label>
                <input
                  type="text"
                  value={currentItem.name}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={currentItem.item_type}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      item_type: e.target.value as "equipment" | "material",
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                >
                  <option value="equipment">Equipment</option>
                  <option value="material">Material</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentItem.quantity}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setCurrentItem(null);
                    clearPhoto();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading..." : "Update Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Item"
        message={`Are you sure you want to delete ${deleteDialog.itemName}? This will affect all sites using it.`}
        confirmLabel="Yes, Delete"
        cancelLabel="No, Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteDialog}
        isProcessing={isDeleting}
      />
    </Layout>
  );
}
