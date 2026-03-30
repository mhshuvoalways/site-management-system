import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckSquare,
  Download,
  Edit,
  FileText,
  Image as ImageIcon,
  MapPin,
  Plus,
  Square,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { useEffect, useRef, useState } from "react";
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
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  takenAt?: string;
}

export function SiteManagerBuildingControl() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [site, setSite] = useState<Site | null>(null);
  const [reports, setReports] = useState<BuildingControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newReport, setNewReport] = useState({ notes: "" });
  const [photoUploads, setPhotoUploads] = useState<PhotoUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; photoId: string; photoUrl: string }>({
    isOpen: false, photoId: "", photoUrl: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingReport, setEditingReport] = useState<BuildingControl | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editPhotoUploads, setEditPhotoUploads] = useState<PhotoUpload[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteReportDialog, setDeleteReportDialog] = useState<{ isOpen: boolean; report: BuildingControl | null }>({
    isOpen: false, report: null,
  });
  const [isDeletingReport, setIsDeletingReport] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState<string | null>(null);
  const [showBulkDownloadMenu, setShowBulkDownloadMenu] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<BuildingControlPhoto | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const editCameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (showDownloadMenu) setShowDownloadMenu(null);
      if (showBulkDownloadMenu) setShowBulkDownloadMenu(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showDownloadMenu, showBulkDownloadMenu]);

  const loadData = async () => {
    if (!id) return;
    const [siteData, reportsData] = await Promise.all([
      supabase.from("sites").select("*").eq("id", id).single(),
      supabase
        .from("building_control")
        .select("*, created_by_profile:profiles!building_control_created_by_fkey(full_name), updated_by_profile:profiles!building_control_updated_by_fkey!left(full_name)")
        .eq("site_id", id)
        .order("created_at", { ascending: false }),
    ]);
    if (reportsData.data) {
      const reportsWithPhotos = await Promise.all(
        reportsData.data.map(async (report: any) => {
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

  const getGeolocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch { return `${lat.toFixed(6)}, ${lng.toFixed(6)}`; }
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const geo = await getGeolocation();
    let locationAddress = "";
    if (geo) locationAddress = await reverseGeocode(geo.lat, geo.lng);
    const newUploads: PhotoUpload[] = Array.from(files).map((file) => ({
      file, preview: URL.createObjectURL(file), notes: "",
      latitude: geo?.lat, longitude: geo?.lng,
      locationAddress: locationAddress || undefined, takenAt: new Date().toISOString(),
    }));
    if (isEdit) setEditPhotoUploads((prev) => [...prev, ...newUploads]);
    else setPhotoUploads((prev) => [...prev, ...newUploads]);
    e.target.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newUploads: PhotoUpload[] = Array.from(files).map((file) => ({
      file, preview: URL.createObjectURL(file), notes: "",
    }));
    setPhotoUploads([...photoUploads, ...newUploads]);
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newUploads: PhotoUpload[] = Array.from(files).map((file) => ({
      file, preview: URL.createObjectURL(file), notes: "",
    }));
    setEditPhotoUploads((prev) => [...prev, ...newUploads]);
  };

  const removePhotoUpload = (index: number) => {
    URL.revokeObjectURL(photoUploads[index].preview);
    setPhotoUploads(photoUploads.filter((_, i) => i !== index));
  };

  const removeEditPhotoUpload = (index: number) => {
    URL.revokeObjectURL(editPhotoUploads[index].preview);
    setEditPhotoUploads(editPhotoUploads.filter((_, i) => i !== index));
  };

  const updatePhotoNotes = (index: number, notes: string) => {
    const updated = [...photoUploads];
    updated[index].notes = notes;
    setPhotoUploads(updated);
  };

  const uploadPhotosForReport = async (reportId: string, uploads: PhotoUpload[]) => {
    for (const upload of uploads) {
      const fileExt = upload.file.name.split(".").pop();
      const fileName = `${reportId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("building-control-photos").upload(fileName, upload.file);
      if (uploadError) { console.error("Failed to upload photo:", uploadError); continue; }
      const { data: publicUrlData } = supabase.storage.from("building-control-photos").getPublicUrl(fileName);
      await supabase.from("building_control_photos").insert({
        building_control_id: reportId, photo_url: publicUrlData.publicUrl, notes: upload.notes,
        created_by: profile!.id, latitude: upload.latitude ?? null, longitude: upload.longitude ?? null,
        location_address: upload.locationAddress ?? null, taken_at: upload.takenAt ?? null,
      });
      URL.revokeObjectURL(upload.preview);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !profile) return;
    setUploading(true);
    const { data: reportData, error: reportError } = await supabase
      .from("building_control").insert({ site_id: id, notes: newReport.notes, created_by: profile.id })
      .select().single();
    if (reportError || !reportData) { alert("Failed to create report"); setUploading(false); return; }
    if (photoUploads.length > 0) await uploadPhotosForReport(reportData.id, photoUploads);
    setNewReport({ notes: "" }); setPhotoUploads([]); setShowNewModal(false); setUploading(false); loadData();
  };

  const openDeleteDialog = (photoId: string, photoUrl: string) => setDeleteDialog({ isOpen: true, photoId, photoUrl });
  const closeDeleteDialog = () => { setDeleteDialog({ isOpen: false, photoId: "", photoUrl: "" }); setIsDeleting(false); };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    const fileName = deleteDialog.photoUrl.split("/building-control-photos/")[1];
    if (fileName) await supabase.storage.from("building-control-photos").remove([fileName]);
    const { error } = await supabase.from("building_control_photos").delete().eq("id", deleteDialog.photoId);
    if (!error) { closeDeleteDialog(); loadData(); } else { alert("Failed to delete photo: " + error.message); closeDeleteDialog(); }
  };

  const openEditReport = (report: BuildingControl) => {
    setEditingReport(report); setEditNotes(report.notes); setEditPhotoUploads([]);
  };

  const closeEditReport = () => {
    setEditingReport(null); setEditNotes("");
    editPhotoUploads.forEach((u) => URL.revokeObjectURL(u.preview));
    setEditPhotoUploads([]); setIsUpdating(false);
  };

  const handleDeleteExistingPhoto = async (photoId: string, photoUrl: string) => {
    const fileName = photoUrl.split("/building-control-photos/")[1];
    if (fileName) await supabase.storage.from("building-control-photos").remove([fileName]);
    await supabase.from("building_control_photos").delete().eq("id", photoId);
    if (editingReport) {
      const updatedPhotos = (editingReport.photos || []).filter((p) => p.id !== photoId);
      setEditingReport({ ...editingReport, photos: updatedPhotos });
    }
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !profile) return;
    setIsUpdating(true);
    const { error } = await supabase.from("building_control")
      .update({ notes: editNotes, updated_at: new Date().toISOString(), updated_by: profile.id })
      .eq("id", editingReport.id);
    if (error) { alert("Failed to update report: " + error.message); setIsUpdating(false); return; }
    if (editPhotoUploads.length > 0) await uploadPhotosForReport(editingReport.id, editPhotoUploads);
    closeEditReport(); loadData();
  };

  const openDeleteReportDialog = (report: BuildingControl) => setDeleteReportDialog({ isOpen: true, report });
  const closeDeleteReportDialog = () => { setDeleteReportDialog({ isOpen: false, report: null }); setIsDeletingReport(false); };

  const handleConfirmDeleteReport = async () => {
    if (!deleteReportDialog.report) return;
    setIsDeletingReport(true);
    if (deleteReportDialog.report.photos && deleteReportDialog.report.photos.length > 0) {
      const fileNames = deleteReportDialog.report.photos
        .map((photo) => { const parts = photo.photo_url.split("/building-control-photos/"); return parts.length > 1 ? parts[1] : null; })
        .filter((name): name is string => name !== null);
      if (fileNames.length > 0) await supabase.storage.from("building-control-photos").remove(fileNames);
    }
    await supabase.from("building_control_photos").delete().eq("building_control_id", deleteReportDialog.report.id);
    const { error } = await supabase.from("building_control").delete().eq("id", deleteReportDialog.report.id);
    if (!error) { closeDeleteReportDialog(); loadData(); } else { alert("Failed to delete report: " + error.message); closeDeleteReportDialog(); }
  };

  const toggleReportSelection = (reportId: string) => {
    setSelectedReportIds((prev) => { const next = new Set(prev); if (next.has(reportId)) next.delete(reportId); else next.add(reportId); return next; });
  };
  const allReportIds = reports.map((r) => r.id);
  const selectAllReports = () => {
    if (selectedReportIds.size === allReportIds.length && allReportIds.length > 0) setSelectedReportIds(new Set());
    else setSelectedReportIds(new Set(allReportIds));
  };

  const handleBulkDeleteReports = async () => {
    if (selectedReportIds.size === 0) return;
    setIsBulkDeleting(true);
    for (const reportId of selectedReportIds) {
      const report = reports.find((r) => r.id === reportId);
      if (!report) continue;
      if (report.photos && report.photos.length > 0) {
        const fileNames = report.photos.map((photo) => { const parts = photo.photo_url.split("/building-control-photos/"); return parts.length > 1 ? parts[1] : null; }).filter((name): name is string => name !== null);
        if (fileNames.length > 0) await supabase.storage.from("building-control-photos").remove(fileNames);
      }
      await supabase.from("building_control_photos").delete().eq("building_control_id", reportId);
      await supabase.from("building_control").delete().eq("id", reportId);
    }
    setSelectedReportIds(new Set()); setIsBulkDeleting(false); loadData();
  };

  const loadImageAsDataUrl = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height; const ctx = canvas.getContext("2d"); ctx?.drawImage(img, 0, 0); resolve(canvas.toDataURL("image/jpeg", 0.8)); };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const generateReportPdf = async (reportsToDownload: BuildingControl[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    for (let ri = 0; ri < reportsToDownload.length; ri++) {
      const report = reportsToDownload[ri];
      if (ri > 0) doc.addPage();
      let y = margin;
      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("Site Photos Report", margin, y); y += 10;
      doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
      doc.text(site?.name || "", margin, y); y += 8;
      doc.setFontSize(10);
      const date = new Date(report.created_at ?? "").toLocaleDateString();
      const author = report.created_by_profile?.full_name || "Unknown";
      doc.text(`Date: ${date}  |  By: ${author}`, margin, y); y += 12;
      doc.setDrawColor(200); doc.line(margin, y, pageWidth - margin, y); y += 8;
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
      doc.text("Notes:", margin, y); y += 6;
      doc.setFont("helvetica", "normal");
      const noteLines = doc.splitTextToSize(report.notes, contentWidth);
      for (const line of noteLines) { if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin; } doc.text(line, margin, y); y += 5; }
      y += 6;

      if (report.photos && report.photos.length > 0) {
        doc.setFont("helvetica", "bold"); doc.text(`Photos (${report.photos.length}):`, margin, y); y += 8;
        doc.setFont("helvetica", "normal");
        for (const photo of report.photos) {
          const dataUrl = await loadImageAsDataUrl(photo.photo_url);
          if (!dataUrl) continue;
          const imgProps = doc.getImageProperties(dataUrl);
          const maxW = contentWidth; const maxH = 100;
          const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
          const imgW = imgProps.width * ratio; const imgH = imgProps.height * ratio;
          if (y + imgH + 10 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin; }
          doc.addImage(dataUrl, "JPEG", margin, y, imgW, imgH); y += imgH + 3;
          if (photo.location_address || photo.taken_at) {
            doc.setFontSize(8); doc.setTextColor(100);
            const locationLine = [photo.location_address ? `📍 ${photo.location_address}` : "", photo.taken_at ? `🕐 ${new Date(photo.taken_at).toLocaleString()}` : ""].filter(Boolean).join("  |  ");
            const locLines = doc.splitTextToSize(locationLine, contentWidth);
            for (const line of locLines) { doc.text(line, margin, y); y += 4; }
            doc.setFontSize(11); doc.setTextColor(0);
          }
          if (photo.notes) {
            doc.setFontSize(9); doc.setTextColor(80);
            const photoNoteLines = doc.splitTextToSize(photo.notes, contentWidth);
            for (const line of photoNoteLines) { doc.text(line, margin, y); y += 4; }
            doc.setFontSize(11); doc.setTextColor(0);
          }
          y += 6;
        }
      }
    }
    return doc;
  };

  const handleDownloadReport = async (report: BuildingControl, format: "pdf" | "images" = "pdf") => {
    setIsDownloading(true); setShowDownloadMenu(null);
    try {
      if (format === "pdf") {
        const doc = await generateReportPdf([report]);
        const date = new Date(report.created_at ?? "").toISOString().split("T")[0];
        doc.save(`site-photos-${date}.pdf`);
      } else {
        if (report.photos) {
          for (const photo of report.photos) {
            try {
              const response = await fetch(photo.photo_url);
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `photo-${photo.id}.jpg`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            } catch (e) {
              console.error("Failed to download photo:", e);
            }
          }
        }
      }
    } catch (err) { console.error("Failed to download:", err); alert("Failed to download"); }
    setIsDownloading(false);
  };

  const handleBulkDownloadReports = async (format: "pdf" | "images" = "pdf") => {
    if (selectedReportIds.size === 0) return;
    setIsDownloading(true); setShowBulkDownloadMenu(false);
    try {
      const selectedReports = reports.filter((r) => selectedReportIds.has(r.id));
      if (format === "pdf") {
        const doc = await generateReportPdf(selectedReports);
        doc.save(`site-photos-reports-${selectedReports.length}.pdf`);
      } else {
        for (const report of selectedReports) {
          if (report.photos) {
            for (const photo of report.photos) {
              try {
                const response = await fetch(photo.photo_url);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `photo-${photo.id}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } catch (e) {
                console.error("Failed to download photo:", e);
              }
            }
          }
        }
      }
    } catch (err) { console.error("Failed to download:", err); alert("Failed to download"); }
    setIsDownloading(false);
  };

  const formatLastModified = (report: BuildingControl) => {
    if (!report.updated_at || !report.updated_by) return null;
    if (report.updated_at === report.created_at) return null;
    const date = new Date(report.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const name = report.updated_by_profile?.full_name || "Unknown";
    return `Last modified by ${name} on ${date}`;
  };

  if (loading) return <Layout><div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0db2ad]"></div></div></Layout>;
  if (!site) return <Layout><div className="text-center py-12"><p className="text-gray-600">Site not found</p></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to={`/site-manager/sites/${id}`} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Site Photos</h1>
            <p className="text-gray-600 mt-1">{site.name}</p>
          </div>
          <button onClick={() => setShowNewModal(true)} className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition">
            <Plus className="w-5 h-5" /><span>New Report</span>
          </button>
        </div>

        {reports.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={selectAllReports} className="inline-flex items-center space-x-2 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              {selectedReportIds.size === allReportIds.length && allReportIds.length > 0 ? <CheckSquare className="w-4 h-4 text-[#0db2ad]" /> : <Square className="w-4 h-4 text-gray-400" />}
              <span>All Reports ({reports.length})</span>
            </button>
          </div>
        )}

        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Yet</h3>
            <p className="text-gray-600 mb-6">Create your first site photos report.</p>
            <button onClick={() => setShowNewModal(true)} className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition">
              <Plus className="w-5 h-5" /><span>Create First Report</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className={`bg-white rounded-xl shadow-sm border p-6 ${selectedReportIds.has(report.id) ? "border-[#0db2ad] ring-2 ring-[#0db2ad]" : "border-gray-100"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <button onClick={() => toggleReportSelection(report.id)} className="mt-1 flex-shrink-0">
                      {selectedReportIds.has(report.id) ? <CheckSquare className="w-5 h-5 text-[#0db2ad]" /> : <Square className="w-5 h-5 text-gray-400" />}
                    </button>
                    <div className="bg-gradient-to-r from-[#0db2ad] to-[#567fca] p-3 rounded-lg"><FileText className="w-6 h-6 text-white" /></div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Site Photos Entry</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2"><Calendar className="w-4 h-4" /><span>{new Date(report.created_at ?? "").toLocaleDateString()}</span></div>
                        <div className="flex items-center space-x-2"><User className="w-4 h-4" /><span>{report.created_by_profile?.full_name}</span></div>
                      </div>
                      {formatLastModified(report) && <p className="text-xs text-amber-600 mt-1">{formatLastModified(report)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setShowDownloadMenu(showDownloadMenu === report.id ? null : report.id); }} disabled={isDownloading} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50" title="Download">
                        <Download className="w-5 h-5" />
                      </button>
                      {showDownloadMenu === report.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-40">
                          <button onClick={() => handleDownloadReport(report, "pdf")} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg">Download as PDF</button>
                          <button onClick={() => handleDownloadReport(report, "images")} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-b-lg">Download as Images</button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => openEditReport(report)} className="p-2 text-gray-600 hover:text-[#0db2ad] hover:bg-gray-100 rounded-lg transition" title="Edit Report"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => openDeleteReportDialog(report)} className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete Report"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-4"><p className="text-gray-900 whitespace-pre-wrap">{report.notes}</p></div>
                {report.photos && report.photos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2"><ImageIcon className="w-4 h-4" /><span>Photos ({report.photos.length})</span></h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.photos.map((photo: BuildingControlPhoto) => (
                        <div key={photo.id} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200 group">
                          <div className="relative">
                            <img src={photo.photo_url} alt="Site photo" className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition" onClick={() => setViewingPhoto(photo)} />
                            <div className="absolute top-2 right-2">
                              <button onClick={() => openDeleteDialog(photo.id, photo.photo_url)} className="p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-red-700"><X className="w-4 h-4" /></button>
                            </div>
                            {(photo.location_address || photo.latitude) && (
                              <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center space-x-1 max-w-[80%]">
                                <MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{photo.location_address || `${photo.latitude?.toFixed(6)}, ${photo.longitude?.toFixed(6)}`}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 space-y-1">
                            {photo.notes && <p className="text-sm text-gray-700">{photo.notes}</p>}
                            {photo.taken_at && <p className="text-xs text-gray-400">Taken: {new Date(photo.taken_at).toLocaleString()}</p>}
                            {(photo.location_address || photo.latitude) && (
                              <p className="text-xs text-gray-400 flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span>{photo.location_address || `${photo.latitude?.toFixed(6)}, ${photo.longitude?.toFixed(6)}`}</span>
                              </p>
                            )}
                          </div>
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

      {/* New Report Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">New Site Photos Report</h2>
            <form onSubmit={handleCreateReport} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Notes</label>
                <textarea value={newReport.notes} onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none" rows={6} placeholder="Enter notes, observations, and findings..." required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Photos</label>
                <div className="flex gap-3">
                  <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#0db2ad] transition">
                    <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" id="photo-upload" />
                    <label htmlFor="photo-upload" className="cursor-pointer"><Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-600">Upload Photos</p><p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p></label>
                  </div>
                  <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#0db2ad] transition">
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleCameraCapture(e, false)} className="hidden" id="camera-capture" />
                    <label htmlFor="camera-capture" className="cursor-pointer"><Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-600">Take Photo</p><p className="text-xs text-gray-500 mt-1">With geolocation</p></label>
                  </div>
                </div>
              </div>
              {photoUploads.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Photos to Upload ({photoUploads.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {photoUploads.map((upload, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                        <div className="relative">
                          <img src={upload.preview} alt={`Upload ${index + 1}`} className="w-full h-48 object-cover" />
                          <button type="button" onClick={() => removePhotoUpload(index)} className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"><X className="w-4 h-4" /></button>
                          {upload.locationAddress && <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center space-x-1 max-w-[80%]"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{upload.locationAddress}</span></div>}
                        </div>
                        <div className="p-3"><input type="text" value={upload.notes} onChange={(e) => updatePhotoNotes(index, e.target.value)} placeholder="Add notes for this photo (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none" /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => { setShowNewModal(false); photoUploads.forEach((u) => URL.revokeObjectURL(u.preview)); setPhotoUploads([]); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition" disabled={uploading}>Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed">{uploading ? "Creating..." : "Create Report"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {editingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Site Photos Report</h2>
            <form onSubmit={handleUpdateReport} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Notes</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none" rows={6} placeholder="Enter notes..." required />
              </div>
              {editingReport.photos && editingReport.photos.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Existing Photos ({editingReport.photos.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {editingReport.photos.map((photo) => (
                      <div key={photo.id} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                        <div className="relative">
                          <img src={photo.photo_url} alt="Existing" className="w-full h-48 object-cover" />
                          <button type="button" onClick={() => handleDeleteExistingPhoto(photo.id, photo.photo_url)} className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"><X className="w-4 h-4" /></button>
                          {(photo.location_address || photo.latitude) && <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center space-x-1 max-w-[80%]"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{photo.location_address || `${photo.latitude?.toFixed(6)}, ${photo.longitude?.toFixed(6)}`}</span></div>}
                        </div>
                        {photo.notes && <div className="p-3"><p className="text-sm text-gray-700">{photo.notes}</p></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add More Photos</label>
                <div className="flex gap-3">
                  <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#0db2ad] transition">
                    <input type="file" accept="image/*" multiple onChange={handleEditFileSelect} className="hidden" id="edit-photo-upload" />
                    <label htmlFor="edit-photo-upload" className="cursor-pointer"><Upload className="w-8 h-8 text-gray-400 mx-auto mb-1" /><p className="text-sm text-gray-600">Upload Photos</p></label>
                  </div>
                  <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#0db2ad] transition">
                    <input ref={editCameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleCameraCapture(e, true)} className="hidden" id="edit-camera-capture" />
                    <label htmlFor="edit-camera-capture" className="cursor-pointer"><Camera className="w-8 h-8 text-gray-400 mx-auto mb-1" /><p className="text-sm text-gray-600">Take Photo</p></label>
                  </div>
                </div>
              </div>
              {editPhotoUploads.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">New Photos ({editPhotoUploads.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {editPhotoUploads.map((upload, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                        <div className="relative">
                          <img src={upload.preview} alt={`New ${index + 1}`} className="w-full h-48 object-cover" />
                          <button type="button" onClick={() => removeEditPhotoUpload(index)} className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"><X className="w-4 h-4" /></button>
                          {upload.locationAddress && <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center space-x-1 max-w-[80%]"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{upload.locationAddress}</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex space-x-3">
                <button type="button" onClick={closeEditReport} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition" disabled={isUpdating}>Cancel</button>
                <button type="submit" disabled={isUpdating} className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white rounded-lg hover:shadow-lg transition disabled:opacity-50">{isUpdating ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={deleteDialog.isOpen} title="Delete Photo" message="Are you sure you want to delete this photo?" confirmLabel="Yes, Delete" cancelLabel="No, Cancel" onConfirm={handleConfirmDelete} onCancel={closeDeleteDialog} isProcessing={isDeleting} />
      <ConfirmDialog isOpen={deleteReportDialog.isOpen} title="Delete Report" message="Are you sure you want to delete this entire report? All associated photos will also be deleted." confirmLabel="Yes, Delete" cancelLabel="No, Cancel" onConfirm={handleConfirmDeleteReport} onCancel={closeDeleteReportDialog} isProcessing={isDeletingReport} />

      {viewingPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" onClick={() => setViewingPhoto(null)}>
          <div className="absolute top-4 right-4"><button onClick={() => setViewingPhoto(null)} className="p-2 bg-white bg-opacity-20 text-white rounded-full hover:bg-opacity-30 transition"><X className="w-6 h-6" /></button></div>
          <div className="max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={viewingPhoto.photo_url} alt="Site photo" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            <div className="mt-4 space-y-2 text-center">
              {viewingPhoto.notes && <div className="bg-white bg-opacity-10 rounded-lg px-4 py-2"><p className="text-white">{viewingPhoto.notes}</p></div>}
              {viewingPhoto.location_address && <div className="flex items-center justify-center space-x-2 text-white text-sm opacity-80"><MapPin className="w-4 h-4" /><span>{viewingPhoto.location_address}</span></div>}
              {viewingPhoto.taken_at && <p className="text-white text-sm opacity-60">Taken: {new Date(viewingPhoto.taken_at).toLocaleString()}</p>}
            </div>
          </div>
        </div>
      )}

      {selectedReportIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-4 z-50">
          <span className="text-sm font-medium">{selectedReportIds.size} report{selectedReportIds.size > 1 ? "s" : ""} selected</span>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowBulkDownloadMenu(!showBulkDownloadMenu); }} disabled={isDownloading} className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              <Download className="w-4 h-4" /><span>{isDownloading ? "Downloading..." : "Download"}</span>
            </button>
            {showBulkDownloadMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white text-gray-900 border border-gray-200 rounded-lg shadow-lg z-10 w-44">
                <button onClick={() => handleBulkDownloadReports("pdf")} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg">Download as PDF</button>
                <button onClick={() => handleBulkDownloadReports("images")} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-b-lg">Download as Images</button>
              </div>
            )}
          </div>
          <button onClick={handleBulkDeleteReports} disabled={isBulkDeleting} className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50">
            <Trash2 className="w-4 h-4" /><span>{isBulkDeleting ? "Deleting..." : "Delete Selected"}</span>
          </button>
          <button onClick={() => setSelectedReportIds(new Set())} className="px-3 py-2 text-gray-300 hover:text-white transition">Cancel</button>
        </div>
      )}
    </Layout>
  );
}
