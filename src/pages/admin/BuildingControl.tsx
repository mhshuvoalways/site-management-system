import {
  ArrowLeft,
  Calendar,
  Edit,
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import { BuildingControl, BuildingControlPhoto, Site } from "../../types";

interface PhotoUpload {
  file: File;
  preview: string;
  notes: string;
}

export function BuildingControlPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [site, setSite] = useState<Site | null>(null);
  const [reports, setReports] = useState<BuildingControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newReport, setNewReport] = useState({ notes: "" });
  const [photoUploads, setPhotoUploads] = useState<PhotoUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletePhotoDialog, setDeletePhotoDialog] = useState<{
    isOpen: boolean;
    photoId: string;
    photoUrl: string;
  }>({
    isOpen: false,
    photoId: "",
    photoUrl: "",
  });
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [editingReport, setEditingReport] = useState<BuildingControl | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteReportDialog, setDeleteReportDialog] = useState<{
    isOpen: boolean;
    report: BuildingControl | null;
  }>({
    isOpen: false,
    report: null,
  });
  const [isDeletingReport, setIsDeletingReport] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    const [siteData, reportsData] = await Promise.all([
      supabase.from("sites").select("*").eq("id", id).single(),
      supabase
        .from("building_control")
        .select("*, created_by_profile:profiles(full_name)")
        .eq("site_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (reportsData.data) {
      const reportsWithPhotos = await Promise.all(
        reportsData.data.map(async (report) => {
          const { data: photos } = await supabase
            .from("building_control_photos")
            .select("*, created_by_profile:profiles(full_name)")
            .eq("building_control_id", report.id)
            .order("created_at", { ascending: false });

          return { ...report, photos: photos || [] };
        })
      );
      setReports(reportsWithPhotos);
    }

    setSite(siteData.data);
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newUploads: PhotoUpload[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      notes: "",
    }));

    setPhotoUploads([...photoUploads, ...newUploads]);
  };

  const removePhotoUpload = (index: number) => {
    URL.revokeObjectURL(photoUploads[index].preview);
    setPhotoUploads(photoUploads.filter((_, i) => i !== index));
  };

  const updatePhotoNotes = (index: number, notes: string) => {
    const updated = [...photoUploads];
    updated[index].notes = notes;
    setPhotoUploads(updated);
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !profile) return;

    setUploading(true);

    const { data: reportData, error: reportError } = await supabase
      .from("building_control")
      .insert({
        site_id: id,
        notes: newReport.notes,
        created_by: profile.id,
      })
      .select()
      .single();

    if (reportError || !reportData) {
      alert("Failed to create report");
      setUploading(false);
      return;
    }

    if (photoUploads.length > 0) {
      for (const upload of photoUploads) {
        const fileExt = upload.file.name.split(".").pop();
        const fileName = `${reportData.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("building-control-photos")
          .upload(fileName, upload.file);

        if (uploadError) {
          console.error("Failed to upload photo:", uploadError);
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("building-control-photos")
          .getPublicUrl(fileName);

        await supabase.from("building_control_photos").insert({
          building_control_id: reportData.id,
          photo_url: publicUrlData.publicUrl,
          notes: upload.notes,
          created_by: profile.id,
        });

        URL.revokeObjectURL(upload.preview);
      }
    }

    setNewReport({ notes: "" });
    setPhotoUploads([]);
    setShowNewModal(false);
    setUploading(false);
    loadData();
  };

  const openDeletePhotoDialog = (photoId: string, photoUrl: string) => {
    setDeletePhotoDialog({ isOpen: true, photoId, photoUrl });
  };

  const closeDeletePhotoDialog = () => {
    setDeletePhotoDialog({ isOpen: false, photoId: "", photoUrl: "" });
    setIsDeletingPhoto(false);
  };

  const handleConfirmDeletePhoto = async () => {
    setIsDeletingPhoto(true);

    const fileName = deletePhotoDialog.photoUrl.split(
      "/building-control-photos/"
    )[1];
    if (fileName) {
      await supabase.storage.from("building-control-photos").remove([fileName]);
    }

    const { error } = await supabase
      .from("building_control_photos")
      .delete()
      .eq("id", deletePhotoDialog.photoId);

    if (!error) {
      closeDeletePhotoDialog();
      loadData();
    } else {
      alert("Failed to delete photo: " + error.message);
      closeDeletePhotoDialog();
    }
  };

  const openEditReport = (report: BuildingControl) => {
    setEditingReport(report);
    setEditNotes(report.notes);
  };

  const closeEditReport = () => {
    setEditingReport(null);
    setEditNotes("");
    setIsUpdating(false);
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;

    setIsUpdating(true);

    const { error } = await supabase
      .from("building_control")
      .update({ notes: editNotes })
      .eq("id", editingReport.id);

    if (!error) {
      closeEditReport();
      loadData();
    } else {
      alert("Failed to update report: " + error.message);
      setIsUpdating(false);
    }
  };

  const openDeleteReportDialog = (report: BuildingControl) => {
    setDeleteReportDialog({ isOpen: true, report });
  };

  const closeDeleteReportDialog = () => {
    setDeleteReportDialog({ isOpen: false, report: null });
    setIsDeletingReport(false);
  };

  const handleConfirmDeleteReport = async () => {
    if (!deleteReportDialog.report) return;

    setIsDeletingReport(true);

    // Delete all photos from storage first
    if (deleteReportDialog.report.photos && deleteReportDialog.report.photos.length > 0) {
      const fileNames = deleteReportDialog.report.photos
        .map((photo) => {
          const parts = photo.photo_url.split("/building-control-photos/");
          return parts.length > 1 ? parts[1] : null;
        })
        .filter((name): name is string => name !== null);

      if (fileNames.length > 0) {
        await supabase.storage.from("building-control-photos").remove(fileNames);
      }
    }

    // Delete photos from database (cascade should handle this, but being explicit)
    await supabase
      .from("building_control_photos")
      .delete()
      .eq("building_control_id", deleteReportDialog.report.id);

    // Delete the report
    const { error } = await supabase
      .from("building_control")
      .delete()
      .eq("id", deleteReportDialog.report.id);

    if (!error) {
      closeDeleteReportDialog();
      loadData();
    } else {
      alert("Failed to delete report: " + error.message);
      closeDeleteReportDialog();
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

  if (!site) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Site not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link
            to={`/admin/sites/${id}`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Building Control
            </h1>
            <p className="text-gray-600 mt-1">{site.name}</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>New Report</span>
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Reports Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first building control report.
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Create First Report</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-gradient-to-r from-[#0db2ad] to-[#567fca] p-3 rounded-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Building Control Entry
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(report.created_at ?? "").toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>{report.created_by_profile?.full_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditReport(report)}
                      className="p-2 text-gray-600 hover:text-[#0db2ad] hover:bg-gray-100 rounded-lg transition"
                      title="Edit Report"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openDeleteReportDialog(report)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Report"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {report.notes}
                  </p>
                </div>

                {report.photos && report.photos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4" />
                      <span>Photos ({report.photos.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.photos.map((photo: BuildingControlPhoto) => (
                        <div
                          key={photo.id}
                          className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200 group"
                        >
                          <div className="relative">
                            <img
                              src={photo.photo_url}
                              alt="Building control"
                              className="w-full h-48 object-cover"
                            />
                            <button
                              onClick={() =>
                                openDeletePhotoDialog(photo.id, photo.photo_url)
                              }
                              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {photo.notes && (
                            <div className="p-3">
                              <p className="text-sm text-gray-700">
                                {photo.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              New Building Control Report
            </h2>
            <form onSubmit={handleCreateReport} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Notes
                </label>
                <textarea
                  value={newReport.notes}
                  onChange={(e) =>
                    setNewReport({ ...newReport, notes: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  rows={6}
                  placeholder="Enter building control notes, observations, and findings..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Photos
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#0db2ad] transition">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload photos
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG up to 10MB
                    </p>
                  </label>
                </div>
              </div>

              {photoUploads.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Photos to Upload ({photoUploads.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {photoUploads.map((upload, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200"
                      >
                        <div className="relative">
                          <img
                            src={upload.preview}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-48 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhotoUpload(index)}
                            className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-3">
                          <input
                            type="text"
                            value={upload.notes}
                            onChange={(e) =>
                              updatePhotoNotes(index, e.target.value)
                            }
                            placeholder="Add notes for this photo (optional)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewModal(false);
                    photoUploads.forEach((upload) =>
                      URL.revokeObjectURL(upload.preview)
                    );
                    setPhotoUploads([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Creating..." : "Create Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Edit Building Control Report
            </h2>
            <form onSubmit={handleUpdateReport} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none"
                  rows={6}
                  placeholder="Enter building control notes..."
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={closeEditReport}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deletePhotoDialog.isOpen}
        title="Delete Photo"
        message="Are you sure you want to delete this photo?"
        confirmLabel="Yes, Delete"
        cancelLabel="No, Cancel"
        onConfirm={handleConfirmDeletePhoto}
        onCancel={closeDeletePhotoDialog}
        isProcessing={isDeletingPhoto}
      />

      <ConfirmDialog
        isOpen={deleteReportDialog.isOpen}
        title="Delete Report"
        message="Are you sure you want to delete this entire report? All associated photos will also be deleted."
        confirmLabel="Yes, Delete"
        cancelLabel="No, Cancel"
        onConfirm={handleConfirmDeleteReport}
        onCancel={closeDeleteReportDialog}
        isProcessing={isDeletingReport}
      />
    </Layout>
  );
}
