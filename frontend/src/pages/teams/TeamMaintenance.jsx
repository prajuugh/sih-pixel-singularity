import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  FileText,
  Search,
  RefreshCw,
  HardHat,
  X,
  Eye,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import Modal from "../../components/common/Modal";
import { fetchRequests, submitWorkCompletion } from "../../utils/api";
import { useAuth } from "../../hooks/useAuth";

// Default realistic sample railway maintenance site photo (encoded for instant test on desktop)
const SAMPLE_SITE_PHOTO = "https://images.unsplash.com/photo-1541427468627-a89a96e5ca1d?auto=format&fit=crop&w=1200&q=80";

function compressImage(file, maxWidth = 1280, maxHeight = 1280, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default function TeamMaintenance() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState(() => {
    const t = searchParams.get("tab");
    return t ? t.toUpperCase() : "APPROVED";
  }); // "ALL", "APPROVED", "COMPLETED"

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) setFilterTab(t.toUpperCase());
  }, [searchParams]);
  
  // Completion Modal State
  const [activeTaskForCompletion, setActiveTaskForCompletion] = useState(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [selectedPhotoData, setSelectedPhotoData] = useState(null);
  const [selectedPhotoName, setSelectedPhotoName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // View Evidence Modal State
  const [viewEvidenceTask, setViewEvidenceTask] = useState(null);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const loadApprovedTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchRequests();
      setRequests(data);
    } catch (err) {
      console.error("Failed to load maintenance requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovedTasks();
  }, []);

  // Filter tasks that are Approved or Completed (sanctioned maintenance works)
  const maintenanceTasks = useMemo(() => {
    return requests.filter((r) => {
      const rawStatus = (r.raw?.status || r.status || "").toUpperCase();
      return (
        rawStatus === "APPROVED" ||
        rawStatus === "COMPLETED" ||
        rawStatus === "WORK_COMPLETED" ||
        r.status === "Approved" ||
        r.status === "Completed" ||
        Boolean(r.completionProof || r.raw?.completion_proof)
      );
    });
  }, [requests]);

  const filteredTasks = useMemo(() => {
    return maintenanceTasks.filter((task) => {
      const isCompleted =
        (task.raw?.status || task.status || "").toUpperCase() === "COMPLETED" ||
        (task.raw?.status || task.status || "").toUpperCase() === "WORK_COMPLETED" ||
        task.status === "Completed" ||
        Boolean(task.completionProof || task.raw?.completion_proof);

      if (filterTab === "APPROVED" && isCompleted) return false;
      if (filterTab === "COMPLETED" && !isCompleted) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchId = (task.id || "").toLowerCase().includes(query);
        const matchType = (task.type || "").toLowerCase().includes(query);
        const matchTrack = (task.raw?.track_id || task.trackId || "").toLowerCase().includes(query);
        const matchDept = (task.department || "").toLowerCase().includes(query);
        return matchId || matchType || matchTrack || matchDept;
      }

      return true;
    });
  }, [maintenanceTasks, filterTab, searchQuery]);

  const counts = useMemo(() => {
    let approved = 0;
    let completed = 0;
    maintenanceTasks.forEach((t) => {
      const isComp =
        (t.raw?.status || t.status || "").toUpperCase() === "COMPLETED" ||
        (t.raw?.status || t.status || "").toUpperCase() === "WORK_COMPLETED" ||
        t.status === "Completed" ||
        Boolean(t.completionProof || t.raw?.completion_proof);
      if (isComp) completed++;
      else approved++;
    });
    return { ALL: maintenanceTasks.length, APPROVED: approved, COMPLETED: completed };
  }, [maintenanceTasks]);

  const handleOpenCompletionModal = (task) => {
    setActiveTaskForCompletion(task);
    setSelectedPhotoData(null);
    setSelectedPhotoName("");
    setSubmitError("");
    setCompletionNotes(
      "Track maintenance and safety inspection completed. Track geometry aligned, fasteners secured, and section certified clear for train operations at permissible sectional speed."
    );
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPhotoName(file.name ? file.name.replace(/\.[^/.]+$/, ".jpg") : "site_proof_photo.jpg");
    try {
      const compressed = await compressImage(file);
      if (compressed) {
        setSelectedPhotoData(compressed);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => setSelectedPhotoData(uploadEvent.target.result);
      reader.readAsDataURL(file);
    }
    e.target.value = ""; // Reset file input so re-selecting same or new photo triggers properly
  };

  const handleUseSamplePhoto = () => {
    setSelectedPhotoData(SAMPLE_SITE_PHOTO);
    setSelectedPhotoName("site_inspection_track_proof.jpg");
  };

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();
    if (!activeTaskForCompletion) return;

    if (!selectedPhotoData) {
      setSubmitError("Please attach a photo or select an image from your gallery/camera as work completion proof.");
      return;
    }

    if (!completionNotes.trim()) {
      setSubmitError("Please provide field completion notes or safety certification.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        photo: selectedPhotoData,
        photo_name: selectedPhotoName || "site_work_completion.jpg",
        notes: completionNotes.trim(),
        completed_by: user?.name || user?.username || "Field Engineering Crew",
        completed_at: new Date().toISOString(),
      };

      const res = await submitWorkCompletion(activeTaskForCompletion.id, payload);

      if (res.success) {
        setSuccessToast(`Maintenance task ${activeTaskForCompletion.id} marked as completed! Evidence submitted for Officer sign-off.`);
        setTimeout(() => setSuccessToast(""), 6000);
        setActiveTaskForCompletion(null);
        await loadApprovedTasks();
      } else {
        setSubmitError(res.message || "Failed to submit work completion proof.");
      }
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || "Error submitting completion proof.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7f8]">
      <Navbar />

      <div className="flex flex-1">
        <Sidebar />

        <main className="min-w-0 flex-1 p-4 pb-20 md:p-6 md:pb-8 xl:p-8">
          <div className="mx-auto max-w-5xl">
            {/* Page Header */}
            <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <HardHat size={13} className="text-emerald-700" />
                    Field Crew Operations
                  </span>
                  <p className="text-sm font-semibold text-[#49677d]">Sanctioned Possessions</p>
                </div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#172630]">
                  Track Maintenance Execution
                </h1>
                <p className="mt-2 max-w-2xl text-base leading-6 text-[#5f6f79]">
                  Execute approved block possessions, log field progress, and submit photo evidence to the Traffic Officer for line restoration.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadApprovedTasks}
                  disabled={loading}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#cbd6dc] bg-white px-4 text-sm font-semibold text-[#29485e] hover:bg-[#f8fbfc] shadow-2xs transition-all disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  {loading ? "Refreshing…" : "Refresh"}
                </button>
                <Link
                  to="/teams/requests"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#b83825] px-4 text-sm font-semibold text-white hover:bg-[#9a2e1d] shadow-2xs transition-all"
                >
                  <Wrench size={16} />
                  New Request
                </Link>
              </div>
            </header>

            {/* Notification Toast */}
            {successToast && (
              <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>{successToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessToast("")}
                  className="text-emerald-700 hover:text-emerald-950 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Statistics Banner */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
              <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ready to Execute</p>
                  <p className="text-2xl font-black text-emerald-700 mt-0.5">{counts.APPROVED}</p>
                  <p className="text-xs text-gray-500 mt-1">Approved possession blocks</p>
                </div>
                <div className="size-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Wrench size={22} />
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completed Work</p>
                  <p className="text-2xl font-black text-blue-700 mt-0.5">{counts.COMPLETED}</p>
                  <p className="text-xs text-gray-500 mt-1">Evidence submitted</p>
                </div>
                <div className="size-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Camera size={22} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Sanctioned</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">{counts.ALL}</p>
                  <p className="text-xs text-gray-500 mt-1">Track possession tasks</p>
                </div>
                <div className="size-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="mb-4 rounded-xl border border-[#d9e1e5] bg-white p-3 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
              {/* Tab Pills */}
              <div className="flex gap-1 rounded-lg bg-[#f1f5f6] p-1">
                <button
                  type="button"
                  onClick={() => setFilterTab("APPROVED")}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3.5 text-xs font-semibold transition-all cursor-pointer ${
                    filterTab === "APPROVED"
                      ? "bg-white text-emerald-900 shadow-2xs font-bold"
                      : "text-gray-600 hover:bg-white/60"
                  }`}
                >
                  <Wrench size={13} className={filterTab === "APPROVED" ? "text-emerald-700" : "text-gray-500"} />
                  <span>Approved for Execution</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[11px] ${filterTab === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"}`}>
                    {counts.APPROVED}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab("COMPLETED")}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3.5 text-xs font-semibold transition-all cursor-pointer ${
                    filterTab === "COMPLETED"
                      ? "bg-white text-blue-900 shadow-2xs font-bold"
                      : "text-gray-600 hover:bg-white/60"
                  }`}
                >
                  <CheckCircle2 size={13} className={filterTab === "COMPLETED" ? "text-blue-700" : "text-gray-500"} />
                  <span>Completed Proof</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[11px] ${filterTab === "COMPLETED" ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"}`}>
                    {counts.COMPLETED}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab("ALL")}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3.5 text-xs font-semibold transition-all cursor-pointer ${
                    filterTab === "ALL"
                      ? "bg-white text-[#172630] shadow-2xs font-bold"
                      : "text-gray-600 hover:bg-white/60"
                  }`}
                >
                  <span>All ({counts.ALL})</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by Request ID or track…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Task List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-44 rounded-xl border border-gray-200 bg-white p-5 animate-pulse" />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <div className="mx-auto size-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <Wrench size={24} />
                </div>
                <h3 className="text-base font-semibold text-gray-900">No maintenance tasks match this filter</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  {filterTab === "APPROVED"
                    ? "All sanctioned blocks have been completed or no approved possession windows are active."
                    : "No completed work submissions recorded yet."}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterTab("ALL");
                      setSearchQuery("");
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    View All Tasks
                  </button>
                  <Link
                    to="/teams/requests"
                    className="rounded-lg bg-[#b83825] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#9a2e1d]"
                  >
                    Submit New Request
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => {
                  const proof = task.completionProof || task.raw?.completion_proof;
                  const isCompleted =
                    Boolean(proof) ||
                    (task.raw?.status || task.status || "").toUpperCase() === "COMPLETED" ||
                    (task.raw?.status || task.status || "").toUpperCase() === "WORK_COMPLETED" ||
                    task.status === "Completed";

                  const scheduledDate = task.date || task.raw?.requested_date || task.raw?.from_date || "2026-09-25";
                  const startWindow = task.recommendedBlock?.startTime || task.raw?.preferred_start_time || "19:00";
                  const endWindow = task.recommendedBlock?.endTime || task.raw?.preferred_end_time || "21:00";
                  const trackSection = task.raw?.track_ids?.join(", ") || task.raw?.track_id || task.trackId || "Section Not Specified";

                  return (
                    <article
                      key={task.id}
                      className={`overflow-hidden rounded-xl border bg-white shadow-2xs transition-all ${
                        isCompleted
                          ? "border-blue-200 ring-1 ring-blue-500/10"
                          : "border-emerald-200 hover:border-emerald-300"
                      }`}
                    >
                      <div className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              {isCompleted ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900 border border-blue-200">
                                  <CheckCircle2 size={13} className="text-blue-700" />
                                  Work Completed · Evidence Submitted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-200">
                                  <Check size={13} className="text-emerald-700 stroke-[3]" />
                                  Possession Sanctioned
                                </span>
                              )}

                              <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded">
                                {task.id}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">{task.department || "Engineering"}</span>
                            </div>

                            {/* Task Title */}
                            <h3 className="mt-2 text-lg font-bold text-gray-900">
                              {task.type || "Track Maintenance"}
                            </h3>

                            {/* Section & Time */}
                            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-600">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800">
                                <MapPin size={14} className="text-blue-600" />
                                Section: <span className="font-mono">{trackSection}</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800">
                                <Clock size={14} className="text-emerald-600" />
                                {scheduledDate} · {startWindow} – {endWindow} ({task.raw?.estimated_duration_minutes || 120} min)
                              </span>
                            </div>

                            {/* Description */}
                            <p className="mt-2 text-xs text-gray-600 leading-relaxed max-w-2xl">
                              {task.raw?.description || task.reason || "Routine track ballast maintenance and safety inspection."}
                            </p>
                          </div>

                          {/* Action Button */}
                          <div className="shrink-0 mt-3 sm:mt-0 flex flex-col items-end gap-2">
                            {!isCompleted ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCompletionModal(task)}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer hover:shadow"
                              >
                                <Camera size={15} />
                                <span>Mark as Completed</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setViewEvidenceTask(task)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 text-xs font-bold text-blue-900 transition-all cursor-pointer"
                              >
                                <Eye size={14} className="text-blue-700" />
                                <span>View Photo Proof</span>
                              </button>
                            )}

                            <span className="text-[11px] text-gray-400">
                              {isCompleted ? "Transmitted to Officer Review" : "Photo proof required to close"}
                            </span>
                          </div>
                        </div>

                        {/* If already completed, show brief summary box */}
                        {isCompleted && proof && (
                          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-start gap-3">
                              {proof.photo && (
                                <img
                                  src={proof.photo}
                                  alt="Proof thumbnail"
                                  className="size-12 rounded-lg object-cover border border-blue-200 shrink-0 cursor-pointer hover:opacity-90"
                                  onClick={() => setViewEvidenceTask(task)}
                                />
                              )}
                              <div>
                                <p className="font-semibold text-blue-950">Field Completion Summary:</p>
                                <p className="text-gray-600 line-clamp-1 mt-0.5">{proof.notes}</p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  Signed off by <span className="font-semibold text-gray-700">{proof.completed_by}</span> on{" "}
                                  {new Date(proof.completed_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-white border border-blue-200 px-2.5 py-1 rounded-lg shrink-0">
                              <ShieldCheck size={13} className="text-blue-600" />
                              {proof.verified_by_officer ? "Verified by Officer" : "Pending Officer Sign-off"}
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── WORK COMPLETION MODAL ── */}
      {activeTaskForCompletion && (
        <Modal
          onClose={() => !submitting && setActiveTaskForCompletion(null)}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 size={12} className="text-emerald-700" />
                  Work Completion Certification
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  Complete {activeTaskForCompletion.id}
                </h3>
                <p className="text-xs text-gray-500">
                  {activeTaskForCompletion.type} · Section {activeTaskForCompletion.raw?.track_id || activeTaskForCompletion.trackId}
                </p>
              </div>
            </div>

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-900 flex items-start gap-2">
                <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCompletion} className="space-y-4 text-xs">
              {/* Photo Upload Zone */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center justify-between">
                  <span>Site Photo Evidence (Required)</span>
                  <span className="text-[11px] text-gray-500 font-normal">Direct Camera or Gallery</span>
                </label>

                {/* Direct Mobile/Device Camera Input */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Gallery / File Chooser Input */}
                <input
                  type="file"
                  ref={galleryInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!selectedPhotoData ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option 1: Live Camera Shutter */}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all cursor-pointer group text-center"
                      >
                        <div className="size-11 rounded-full bg-white shadow-xs border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform mb-2">
                          <Camera size={22} />
                        </div>
                        <span className="font-bold text-xs text-gray-900 group-hover:text-emerald-900">
                          Take Photo (Camera)
                        </span>
                        <span className="text-[10px] text-gray-500 mt-0.5">
                          Opens live mobile camera shutter
                        </span>
                      </button>

                      {/* Option 2: Choose from Gallery / Files */}
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50/80 transition-all cursor-pointer group text-center"
                      >
                        <div className="size-11 rounded-full bg-white shadow-xs border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform mb-2">
                          <ImageIcon size={22} />
                        </div>
                        <span className="font-bold text-xs text-gray-900 group-hover:text-blue-900">
                          Choose from Gallery / Files
                        </span>
                        <span className="text-[10px] text-gray-500 mt-0.5">
                          Pick from device photos & files
                        </span>
                      </button>
                    </div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleUseSamplePhoto}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
                      >
                        Or use sample site photo for instant testing
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-gray-200 max-h-56 bg-black flex items-center justify-center">
                      <img
                        src={selectedPhotoData}
                        alt="Uploaded site proof"
                        className="max-h-56 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPhotoData(null);
                          setSelectedPhotoName("");
                        }}
                        className="absolute top-2 right-2 rounded-full bg-black/70 hover:bg-black p-1 text-white transition-colors cursor-pointer"
                        title="Remove photo"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 px-1 pt-1">
                      <span className="font-semibold truncate max-w-xs">{selectedPhotoName}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                        >
                          <Camera size={13} />
                          <span>Retake (Camera)</span>
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
                        >
                          <ImageIcon size={13} />
                          <span>Gallery</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Field Completion Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  Field Completion Notes & Safety Clearance
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Detail work performed, track gauge tolerance, OHE reconnection, and line clearance…"
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Sign-off Details */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Signing Officer</span>
                  <span className="font-bold text-gray-800">{user?.name || user?.username || "Field Engineering Crew"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Completion Timestamp</span>
                  <span className="font-mono text-gray-800 font-semibold">{new Date().toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setActiveTaskForCompletion(null)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Submitting Proof…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Submit Completion Proof to Officer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── VIEW EVIDENCE MODAL ── */}
      {viewEvidenceTask && (
        <Modal onClose={() => setViewEvidenceTask(null)} maxWidth="max-w-2xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Work Completion Proof
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  {viewEvidenceTask.id} — {viewEvidenceTask.type}
                </h3>
              </div>
            </div>

            {/* Photo Preview */}
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
              <img
                src={viewEvidenceTask.completionProof?.photo || viewEvidenceTask.raw?.completion_proof?.photo || SAMPLE_SITE_PHOTO}
                alt="Site completion photo"
                className="max-h-96 w-full object-contain"
              />
            </div>

            {/* Evidence Metadata */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 text-xs">
              <div>
                <span className="text-gray-500 font-bold uppercase text-[10px]">Field Crew Certification:</span>
                <p className="text-gray-900 mt-0.5 leading-relaxed">
                  {viewEvidenceTask.completionProof?.notes || viewEvidenceTask.raw?.completion_proof?.notes || "Work completed and track tested."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Certified By</span>
                  <span className="font-semibold text-gray-800">
                    {viewEvidenceTask.completionProof?.completed_by || viewEvidenceTask.raw?.completion_proof?.completed_by || "Engineering Crew"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Submission Time</span>
                  <span className="font-mono text-gray-800 font-semibold">
                    {viewEvidenceTask.completionProof?.completed_at
                      ? new Date(viewEvidenceTask.completionProof.completed_at).toLocaleString()
                      : "Verified"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewEvidenceTask(null)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
