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
  Lock,
  Hash,
  Copy,
  Check,
} from "lucide-react";
import Button from "../common/Button";
import { useAuth } from "../../hooks/useAuth";
import TrackPickerMap from "./TrackPickerMap";
import { buildRequestId, fetchRequests } from "../../utils/api";
import {
  departments,
  assetTypes,
  maintenanceTypes,
  assetConditions,
} from "../../utils/constants";

function Field({ label, htmlFor, icon: Icon, required, compact, children, subtitle }) {
  return (
    <div className={compact ? "" : "mb-5"}>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Icon size={16} className="text-[#b83825]" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

const DURATION_PRESETS = [
  { label: "1 hr", minutes: 60 },
  { label: "1.5 hrs", minutes: 90 },
  { label: "2 hrs", minutes: 120 },
  { label: "3 hrs", minutes: 180 },
  { label: "4 hrs", minutes: 240 },
];

export default function RequestForm({ initialRequestId, onSubmit }) {
  const { user } = useAuth();

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
  const [idCopied, setIdCopied] = useState(false);

  useEffect(() => {
    if (user?.department) {
      setForm((prev) => ({ ...prev, department: resolveUserDepartment() }));
    }
  }, [user]);

  useEffect(() => {
    let alive = true;
    fetchRequests()
      .then((rows) => {
        if (!alive) return;
        setForm((prev) => ({
          ...prev,
          requestId: buildRequestId(prev.department, rows?.length || 0),
        }));
      })
      .catch(() => {
        if (!alive) return;
        setForm((prev) => ({
          ...prev,
          requestId: buildRequestId(prev.department, 3),
        }));
      });
    return () => {
      alive = false;
    };
  }, []);

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
      setMapError("Select at least one track before submitting — use the map or type a Track ID.");
      return;
    }
    setMapError("");
    onSubmit?.(form);
  };
  const [showMapPicker, setShowMapPicker] = useState(false);

  return (
    <>
      {/* ──────────────────────────────────────────── */}
      {/* FULL-SCREEN MAP PICKER (shown when checkbox active) */}
      {/* ──────────────────────────────────────────── */}
      {showMapPicker && (
        <div className="absolute inset-0 z-20">
          <TrackPickerMap
            selectedTrackIds={form.trackIds}
            onToggleTrack={handleToggleTrack}
            onClearAll={handleClearAllTracks}
            onContinue={() => { setShowMapPicker(false); setMapError(""); }}
            continueError={mapError}
            active={showMapPicker}
          />
        </div>
      )}

      {/* ──────────────────────────────────────────── */}
      {/* MAIN FORM                                     */}
      {/* ──────────────────────────────────────────── */}
      {!showMapPicker && (
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl space-y-5 rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.04)] ring-1 ring-black/[0.05]"
        >
          {/* ── Select Track from Map checkbox ── */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <input
                id="use-map-picker"
                type="checkbox"
                checked={showMapPicker}
                onChange={(e) => {
                  setShowMapPicker(e.target.checked);
                  setMapError("");
                }}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#b83825]"
              />
              <label htmlFor="use-map-picker" className="cursor-pointer select-none">
                <p className="text-sm font-semibold text-gray-900">Select Track from Live Map</p>
                <p className="text-xs text-gray-500">Click the checkbox to open the map and visually pick track sections</p>
              </label>
            </div>
            {form.trackIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.trackIds.map((tid) => (
                  <span
                    key={tid}
                    className="rounded-md border border-blue-200 bg-white px-2 py-0.5 font-mono text-xs font-bold text-blue-900"
                  >
                    {tid}
                  </span>
                ))}
              </div>
            )}
          </div>

          {mapError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
              {mapError}
            </p>
          )}

          <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b83825]">
                Maintenance Request
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-gray-950">
                Describe the track possession
              </h3>
            </div>
          </div>

          {/* Track IDs: manual entry if no map selection */}
          {form.trackIds.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MapPin size={15} className="text-[#b83825]" />
                Track ID(s) <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-400 ml-1">— or use map above</span>
              </label>
              <input
                type="text"
                placeholder="e.g. KA-T-000666, SEC-SBC-BNC (comma-separated)"
                onBlur={(e) => {
                  const ids = e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
                  ids.forEach((id) => handleToggleTrack(id));
                  e.target.value = "";
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#cf432c]"
              />
              <p className="mt-1.5 text-[11px] text-gray-400">Type IDs and press Tab/click away to add them, or use the map checkbox above.</p>
            </div>
          )}

          {form.trackIds.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                  <MapPin size={16} className="text-[#b83825]" />
                  {form.trackIds.length === 1
                    ? "1 track selected"
                    : `${form.trackIds.length} tracks selected`}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="text-xs font-semibold text-[#b83825] hover:underline"
                  >
                    Change via map
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllTracks}
                    className="text-xs font-semibold text-gray-500 hover:text-red-600 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.trackIds.map((tid) => (
                  <span
                    key={tid}
                    className="rounded-md border border-emerald-200 bg-white px-2 py-0.5 font-mono text-xs font-bold text-emerald-900"
                  >
                    {tid}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Request Tracking ID" htmlFor="request-id" icon={Hash} subtitle="Copy this ID after you submit">
              <div className="flex gap-2">
                <input
                  type="text"
                  id="request-id"
                  value={form.requestId === "Auto-Generated" ? "Assigning…" : form.requestId}
                  readOnly
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-sm font-semibold text-gray-800"
                />
                <button
                  type="button"
                  disabled={form.requestId === "Auto-Generated"}
                  onClick={() => {
                    navigator.clipboard.writeText(form.requestId);
                    setIdCopied(true);
                    setTimeout(() => setIdCopied(false), 2000);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-[background-color,transform] duration-150 hover:bg-gray-50 active:scale-[0.96] disabled:opacity-40"
                >
                  {idCopied ? <Check size={14} className="text-green-700" /> : <Copy size={14} />}
                  {idCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </Field>

            <Field label="Department" htmlFor="request-department" icon={Building2} required subtitle="Auto-assigned from user account">
              <div className="relative">
                <input
                  type="text"
                  id="request-department"
                  value={form.department}
                  readOnly
                  className="w-full border border-green-200 bg-green-50/60 rounded-lg px-3 py-2.5 text-[#8f2c1f] font-semibold cursor-not-allowed"
                />
                <div className="absolute right-3 top-3 flex items-center gap-1 text-xs text-green-700 bg-green-100/80 px-2 py-0.5 rounded">
                  <Lock size={12} />
                  <span>Verified Role</span>
                </div>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Asset Type" htmlFor="asset-type" icon={Layers} required>
              <select
                id="asset-type"
                value={form.assetType}
                onChange={handleChange("assetType")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-[#cf432c] focus:outline-none"
              >
                {assetTypes.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>

            <Field label="Asset Condition" htmlFor="asset-condition" icon={Settings} required>
              <select
                id="asset-condition"
                value={form.assetCondition}
                onChange={handleChange("assetCondition")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-[#cf432c] focus:outline-none"
              >
                {assetConditions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Maintenance Type" htmlFor="maintenance-type" icon={Wrench} required>
            <select
              id="maintenance-type"
              value={form.maintenanceType}
              onChange={handleChange("maintenanceType")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-[#cf432c] focus:outline-none"
            >
              {maintenanceTypes.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="From Date" htmlFor="from-date" icon={Calendar} required compact>
              <input
                type="date"
                id="from-date"
                value={form.fromDate}
                onChange={handleChange("fromDate")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 focus:ring-2 focus:ring-[#cf432c] focus:outline-none"
                required
              />
            </Field>
            <Field label="To Date" htmlFor="to-date" icon={Calendar} required compact>
              <input
                type="date"
                id="to-date"
                value={form.toDate}
                onChange={handleChange("toDate")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 focus:ring-2 focus:ring-[#cf432c] focus:outline-none"
                required
              />
            </Field>
          </div>

          <Field
            label="Required Block Duration"
            htmlFor="duration-minutes"
            icon={Clock}
            required
            subtitle="Estimated track possession needed"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    id="duration-minutes"
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 font-semibold focus:ring-2 focus:ring-[#cf432c] focus:outline-none pr-16"
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

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Quick Select:</span>
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, durationMinutes: preset.minutes }))
                    }
                    className={`cursor-pointer rounded-md px-2.5 py-1 text-xs transition-[color,background-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] ${
                      form.durationMinutes === preset.minutes
                        ? "bg-[#171918] text-white font-semibold shadow-xs"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </Field>

          <Field label="Work Description" htmlFor="work-description" icon={FileText} required>
            <textarea
              id="work-description"
              value={form.workDescription}
              onChange={handleChange("workDescription")}
              maxLength={500}
              rows={3}
              placeholder="Describe the nature of the maintenance work, track condition, and safety precautions..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 resize-none focus:ring-2 focus:ring-[#cf432c] focus:outline-none"
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
      )}
    </>
  );
}
