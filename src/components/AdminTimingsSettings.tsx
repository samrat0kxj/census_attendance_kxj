import React, { useState } from "react";
import { Clock, Check, RefreshCw, AlertTriangle, ShieldAlert } from "lucide-react";
import { SystemSettings } from "../types";

interface AdminTimingsSettingsProps {
  currentSettings: SystemSettings;
  onSave: (settings: SystemSettings) => Promise<void>;
}

// Convert "09:00 AM" into discrete values { hour: "09", minute: "00", ampm: "AM" }
function parseTimeString(timeStr: string) {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return { hour: "09", minute: "00", ampm: "AM" };
  return {
    hour: match[1],
    minute: match[2],
    ampm: match[3].toUpperCase()
  };
}

export default function AdminTimingsSettings({ currentSettings, onSave }: AdminTimingsSettingsProps) {
  const startParts = parseTimeString(currentSettings.checkInStart);
  const endParts = parseTimeString(currentSettings.checkInEnd);
  const outParts = parseTimeString(currentSettings.checkOutEnd);

  const [timings, setTimings] = useState({
    startHour: startParts.hour,
    startMinute: startParts.minute,
    startAmpm: startParts.ampm,
    
    endHour: endParts.hour,
    endMinute: endParts.minute,
    endAmpm: endParts.ampm,
    
    outHour: outParts.hour,
    outMinute: outParts.minute,
    outAmpm: outParts.ampm
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  const handleSelectChange = (name: keyof typeof timings, value: string) => {
    setTimings(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const checkInStart = `${timings.startHour}:${timings.startMinute} ${timings.startAmpm}`;
      const checkInEnd = `${timings.endHour}:${timings.endMinute} ${timings.endAmpm}`;
      const checkOutEnd = `${timings.outHour}:${timings.outMinute} ${timings.outAmpm}`;

      // Basic validation: Check-In Start must be earlier than End, etc.
      // We will save to database
      await onSave({
        checkInStart,
        checkInEnd,
        checkOutEnd
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to update timing configurations.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="bg-[#111114] border border-slate-800 rounded-2xl p-6 shadow-xs max-w-xl mx-auto space-y-5 text-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Clock className="h-5.5 w-5.5 text-indigo-450" />
        <div>
          <h3 className="font-display font-semibold text-white text-base">Configurable Attendance Timings</h3>
          <p className="text-xs text-slate-400">Modify acceptable check-in windows and checkout periods for all employees</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-900/50 text-red-300 p-3 rounded-xl text-xs flex gap-2 items-center">
          <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/20 border border-emerald-900/50 p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
          <span><strong>Timings Updated!</strong> Acceptable shifts have been configured successfully.</span>
        </div>
      )}

      <div className="space-y-4">
        
        {/* Check-In Start Time */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#1A1A1F] rounded-xl border border-slate-800">
          <div>
            <span className="font-semibold text-slate-200 text-sm block">Check-In Start Time</span>
            <span className="text-[11px] text-slate-455">Acceptable check-ins are blocked before this hour</span>
          </div>
          <div className="flex gap-1.5 items-center">
            {/* Hour */}
            <select
              value={timings.startHour}
              onChange={(e) => handleSelectChange("startHour", e.target.value)}
              className="p-1.5 bg-[#111114] border border-slate-800 text-slate-200 rounded-lg text-sm focus:outline-hidden"
            >
              {hours.map(h => <option key={h} value={h} className="bg-[#111114] text-slate-200">{h}</option>)}
            </select>
            <span className="text-slate-600 font-mono">:</span>
            {/* Minute */}
            <select
              value={timings.startMinute}
              onChange={(e) => handleSelectChange("startMinute", e.target.value)}
              className="p-1.5 bg-[#111114] border border-slate-800 text-slate-200 rounded-lg text-sm focus:outline-hidden"
            >
              {minutes.map(m => <option key={m} value={m} className="bg-[#111114] text-slate-200">{m}</option>)}
            </select>
            {/* AM/PM */}
            <select
              value={timings.startAmpm}
              onChange={(e) => handleSelectChange("startAmpm", e.target.value)}
              className="p-1.5 bg-[#111114] border border-slate-800 text-slate-200 rounded-lg text-sm focus:outline-hidden font-semibold"
            >
              <option value="AM" className="bg-[#111114] text-slate-200">AM</option>
              <option value="PM" className="bg-[#111114] text-slate-200">PM</option>
            </select>
          </div>
        </div>

        {/* Check-In End Time */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#1A1A1F] rounded-xl border border-slate-800">
          <div>
            <span className="font-semibold text-slate-200 text-sm block">Check-In End Time</span>
            <span className="text-[11px] text-slate-455">Employees are marked late/absent or blocked after this hour</span>
          </div>
          <div className="flex gap-1.5 items-center">
            {/* Hour */}
            <select
              value={timings.endHour}
              onChange={(e) => handleSelectChange("endHour", e.target.value)}
              className="p-1.5 bg-[#111114] border border-slate-800 text-slate-200 rounded-lg text-sm focus:outline-hidden"
            >
              {hours.map(h => <option key={h} value={h} className="bg-[#111114] text-slate-200">{h}</option>)}
            </select>
            <span className="text-slate-600 font-mono">:</span>
            {/* Minute */}
            <select
              value={timings.endMinute}
              onChange={(e) => handleSelectChange("endMinute", e.target.value)}
              className="p-1.5 bg-[#111114] border border-slate-800 text-slate-200 rounded-lg text-sm focus:outline-hidden"
            >
              {minutes.map(m => <option key={m} value={m} className="bg-[#111114] text-slate-200">{m}</option>)}
            </select>
            {/* AM/PM */}
            <select
              value={timings.endAmpm}
              onChange={(e) => handleSelectChange("endAmpm", e.target.value)}
              className="p-1.5 bg-[#111114] border border-slate-800 text-slate-200 rounded-lg text-sm focus:outline-hidden font-semibold"
            >
              <option value="AM" className="bg-[#111114] text-slate-200">AM</option>
              <option value="PM" className="bg-[#111114] text-slate-200">PM</option>
            </select>
          </div>
        </div>

        {/* Check-Out Allowed Until Time */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#1A1A1F] rounded-xl border border-slate-800">
          <div>
            <span className="font-semibold text-slate-200 text-sm block">Check-Out Allowed Until</span>
            <span className="text-[11px] text-slate-455">Check-out is permitted after Check-in up to this time limit</span>
          </div>
          <div className="flex gap-1.5 items-center">
            {/* Hour */}
            <select
              value={timings.outHour}
              onChange={(e) => handleSelectChange("outHour", e.target.value)}
              className="p-1.5 bg-[#111114] border border-slate-800 text-slate-200 rounded-lg text-sm focus:outline-hidden"
            >
              {hours.map(h => <option key={h} value={h} className="bg-[#111114] text-slate-200">{h}</option>)}
            </select>
            <span className="text-slate-600 font-mono">:</span>
            {/* Minute */}
            <select
              value={timings.outMinute}
              onChange={(e) => handleSelectChange("outMinute", e.target.value)}
              className="p-1.5 bg-[#111114] border border-slate-800 text-slate-200 rounded-lg text-sm focus:outline-hidden"
            >
              {minutes.map(m => <option key={m} value={m} className="bg-[#111114] text-slate-200">{m}</option>)}
            </select>
            {/* AM/PM */}
            <select
              value={timings.outAmpm}
              onChange={(e) => handleSelectChange("outAmpm", e.target.value)}
              className="p-1.5 bg-[#111114] border border-slate-800 text-slate-200 rounded-lg text-sm focus:outline-hidden font-semibold"
            >
              <option value="AM" className="bg-[#111114] text-slate-200">AM</option>
              <option value="PM" className="bg-[#111114] text-slate-200">PM</option>
            </select>
          </div>
        </div>

      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
      >
        {saving ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Updating Rules...
          </>
        ) : (
          <>
            <Check className="h-4.5 w-4.5" />
            Save Configuration Changes
          </>
        )}
      </button>
    </form>
  );
}
