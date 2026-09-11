import { useState, useEffect } from "react";
import {
  FileText,
  Building2,
  Layers,
  Wrench,
  Settings,
  Calendar,
  Clock,
  MapPin,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  Hash,
} from "lucide-react";
import Button from "../common/Button";
import { useAuth } from "../../hooks/useAuth";
import TrackPickerMap from "./TrackPickerMap";
import {
  departments,
  assetTypes,
  maintenanceTypes,
  assetConditions,
} from "../../utils/constants";

function Field({ label, icon: Icon, required, compact, children, subtitle }) {
  return (
    <div className={compact ? "" : "mb-5"}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Icon size={16} className="text-green-800" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

// Duration chip presets
const DURATION_PRESETS = [
  { label: "1 hr", minutes: 60 },
  { label: "1.5 hrs", minutes: 90 },
  { label: "2 hrs", minutes: 120 },
  { label: "3 hrs", minutes: 180 },
  { label: "4 hrs", minutes: 240 },
];

export default function RequestForm({ initialRequestId, onSubmit }) {
  const { user } = useAuth();

  // Helper to resolve user's department
  const resolveUserDepartment = () => {
    if (!user?.department) return departments[0];
    const uDept = user.department.toLowerCase();
    if (uDept.includes("s&t") || uDept.includes("signal") || uDept.includes("smms")) {
      return "Signal & Telecom (SMMS)";
    }
    if (uDept.includes("trac") || uDept.includes("ohe") || uDept.includes("tdms")) {
      return "Traction Distribution";
    }
    return "Engineering";
  };

  const userDept = resolveUserDepartment();

  const [form, setForm] = useState({
    requestId: initialRequestId || "Auto-Generated",
    department: userDept,
    trackIds: [],
    assetType: assetTypes[0],
    maintenanceType: maintenanceTypes[0],
    assetCondition: assetConditions[0],
    workDescription: "",
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    durationMinutes: 120,
  });

  const [mapError, setMapError] = useState("");

  // Keep department in sync if user changes
  useEffect(() => {
    if (user?.department) {
      setForm((prev) => ({ ...prev, department: resolveUserDepartment() }));
    }
  }, [user]);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleToggleTrack = (trackId) => {
    if (!trackId) return;
    const normId = trackId.toUpperCase();
    setForm((prev) => {
      const existing = prev.trackIds.map((id) => id.toUpperCase());
      const alreadyIn = existing.includes(normId);
      const newIds = alreadyIn
        ? prev.trackIds.filter((id) => id.toUpperCase() !== normId)
        : [...prev.trackIds, normId];
      return { ...prev, trackIds: newIds };
    });
    setMapError("");
  };

  const handleClearAllTracks = () => {
    setForm((prev) => ({ ...prev, trackIds: [] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.trackIds.length === 0) {
      setMapError("Please click on at least one railway track segment on the map.");
      const mapElement = document.getElementById("track-picker-section");
      mapElement?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setMapError("");
    onSubmit?.(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl space-y-5"
    >
      {/* Request ID & Department */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Request Tracking ID" icon={Hash} subtitle="System-assigned tracking ID">
          <div className="relative">
            <input
              type="text"
              value={form.requestId === "Auto-Generated" ? "Assigned on submission (e.g. ENG-2026-...)" : form.requestId}
              readOnly
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-gray-700 font-mono text-sm font-semibold cursor-not-allowed"
            />
            <div className="absolute right-3 top-3 flex items-center gap-1 text-xs text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded font-mono">
              <span>Auto-ID</span>
            </div>
          </div>
        </Field>

        <Field label="Department" icon={Building2} required subtitle="Auto-assigned from user account">
          <div className="relative">
            <input
              type="text"
              value={form.department}
              readOnly
              className="w-full border border-green-200 bg-green-50/60 rounded-lg px-3 py-2.5 text-green-900 font-semibold cursor-not-allowed"
            />
            <div className="absolute right-3 top-3 flex items-center gap-1 text-xs text-green-700 bg-green-100/80 px-2 py-0.5 rounded">
              <Lock size={12} />
              <span>Verified Role</span>
            </div>
          </div>
        </Field>
      </div>

      {/* Asset Type & Condition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Asset Type" icon={Layers} required>
          <select
            value={form.assetType}
            onChange={handleChange("assetType")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-green-600 focus:outline-none"
          >
            {assetTypes.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>

        <Field label="Asset Condition" icon={Settings} required>
          <select
            value={form.assetCondition}
            onChange={handleChange("assetCondition")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-green-600 focus:outline-none"
          >
            {assetConditions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Maintenance Type */}
      <Field label="Maintenance Type" icon={Wrench} required>
        <select
          value={form.maintenanceType}
          onChange={handleChange("maintenanceType")}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-green-600 focus:outline-none"
        >
          {maintenanceTypes.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>

      {/* Date Range: From Date & To Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="From Date" icon={Calendar} required compact>
          <input
            type="date"
            value={form.fromDate}
            onChange={handleChange("fromDate")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 focus:ring-2 focus:ring-green-600 focus:outline-none"
            required
          />
        </Field>
        <Field label="To Date" icon={Calendar} required compact>
          <input
            type="date"
            value={form.toDate}
            onChange={handleChange("toDate")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 focus:ring-2 focus:ring-green-600 focus:outline-none"
            required
          />
        </Field>
      </div>

      {/* Duration (Replaces Start and End Time) */}
      <Field
        label="Required Block Duration"
        icon={Clock}
        required
        subtitle="Estimated track possession needed"
      >
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                min={15}
                max={720}
                step={15}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    durationMinutes: Math.max(15, Number(e.target.value) || 0),
                  }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 font-semibold focus:ring-2 focus:ring-green-600 focus:outline-none pr-16"
                required
              />
              <span className="absolute right-3 top-3 text-xs font-medium text-gray-400">
                minutes
              </span>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap bg-gray-100 px-2.5 py-2 rounded-lg font-medium">
              ≈ {(form.durationMinutes / 60).toFixed(1)} hrs
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Quick Select:</span>
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.minutes}
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, durationMinutes: preset.minutes }))
                }
                className={`px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${
                  form.durationMinutes === preset.minutes
                    ? "bg-green-800 text-white font-semibold shadow-xs"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </Field>

      {/* Location / Interactive Leaflet Track Map Picker (Multi-Segment) */}
      <div id="track-picker-section" className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <MapPin size={16} className="text-green-800" />
            Track Segment Location
            <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-gray-400">
            Click multiple segments to build block possession zone
          </span>
        </div>

        <TrackPickerMap
          selectedTrackIds={form.trackIds}
          onToggleTrack={handleToggleTrack}
          onClearAll={handleClearAllTracks}
        />

        {mapError && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg mt-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{mapError}</span>
          </div>
        )}
      </div>

      {/* Work Description */}
      <Field label="Work Description" icon={FileText} required>
        <textarea
          value={form.workDescription}
          onChange={handleChange("workDescription")}
          maxLength={500}
          rows={3}
          placeholder="Describe the nature of the maintenance work, track condition, and safety precautions..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 resize-none focus:ring-2 focus:ring-green-600 focus:outline-none"
          required
        />
        <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
          <span>Be specific to assist the Officer and AI planning scheduler.</span>
          <span>{form.workDescription.length}/500</span>
        </div>
      </Field>

      <Button type="submit" icon={Send} fullWidth className="mt-2 py-3 text-base">
        Submit Maintenance Request
      </Button>
    </form>
  );
}

