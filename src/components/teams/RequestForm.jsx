import { useState } from "react";
import {
  FileText,
  Building2,
  Layers,
  Tag,
  Wrench,
  Settings,
  Calendar,
  Clock,
  MapPin,
  Send,
} from "lucide-react";
import Button from "../common/Button";
import {
  departments,
  assetTypes,
  maintenanceTypes,
  assetConditions,
} from "../../utils/constants";

function Field({ label, icon: Icon, required, compact, children }) {
  return (
    <div className={compact ? "" : "mb-5"}>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
        <Icon size={16} className="text-green-800" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function RequestForm({ initialRequestId, onSubmit }) {
  const [form, setForm] = useState({
    requestId: initialRequestId || "SMMS-2026-00782",
    department: departments[0],
    assetType: assetTypes[0],
    assetId: "SIG-HBL-042",
    maintenanceType: maintenanceTypes[0],
    assetCondition: assetConditions[0],
    workDescription: "",
    fromDate: "",
    toDate: "",
    fromTime: "",
    toTime: "",
  });

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl"
    >
      <Field label="Request ID" icon={FileText} required>
        <input
          type="text"
          value={form.requestId}
          readOnly
          className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-gray-500"
        />
      </Field>

      <Field label="Department" icon={Building2} required>
        <select
          value={form.department}
          onChange={handleChange("department")}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-green-800 font-medium"
        >
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </Field>

      <Field label="Asset Type" icon={Layers} required>
        <select
          value={form.assetType}
          onChange={handleChange("assetType")}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-green-800 font-medium"
        >
          {assetTypes.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </Field>

      <Field label="Asset ID" icon={Tag} required>
        <input
          type="text"
          value={form.assetId}
          onChange={handleChange("assetId")}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700"
        />
      </Field>

      <Field label="Maintenance Type" icon={Wrench} required>
        <select
          value={form.maintenanceType}
          onChange={handleChange("maintenanceType")}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-green-800 font-medium"
        >
          {maintenanceTypes.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>

      <Field label="Asset Condition" icon={Settings} required>
        <select
          value={form.assetCondition}
          onChange={handleChange("assetCondition")}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-green-800 font-medium"
        >
          {assetConditions.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Work Description" icon={FileText} required>
        <textarea
          value={form.workDescription}
          onChange={handleChange("workDescription")}
          maxLength={500}
          rows={3}
          placeholder="Describe the work to be done"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 resize-none"
        />
        <p className="text-xs text-gray-400 text-right mt-1">
          {form.workDescription.length}/500
        </p>
      </Field>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <Field label="From Date" icon={Calendar} required compact>
          <input
            type="date"
            value={form.fromDate}
            onChange={handleChange("fromDate")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700"
          />
        </Field>
        <Field label="To Date" icon={Calendar} required compact>
          <input
            type="date"
            value={form.toDate}
            onChange={handleChange("toDate")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700"
          />
        </Field>
        <Field label="From Time" icon={Clock} required compact>
          <input
            type="time"
            value={form.fromTime}
            onChange={handleChange("fromTime")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700"
          />
        </Field>
        <Field label="To Time" icon={Clock} required compact>
          <input
            type="time"
            value={form.toTime}
            onChange={handleChange("toTime")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700"
          />
        </Field>
      </div>

      <Field label="Location (Select on Map)" icon={MapPin}>
        {/* TODO: replace with a real Leaflet/Google Maps picker */}
        <div className="border border-gray-200 rounded-lg h-56 bg-green-50 flex items-center justify-center text-sm text-gray-400">
          Map picker goes here
        </div>
        <button
          type="button"
          className="w-full mt-2 border border-gray-200 rounded-lg py-2 text-sm text-gray-500 flex items-center justify-center gap-2 hover:bg-gray-50"
        >
          <MapPin size={16} />
          Click on the map to select location
        </button>
      </Field>

      <Button type="submit" icon={Send} fullWidth className="mt-2">
        Submit Request
      </Button>
    </form>
  );
}
