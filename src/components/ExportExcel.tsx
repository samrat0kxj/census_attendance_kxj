import React, { useState } from "react";
import { Download, Calendar, Users, Building, FileSpreadsheet, Check, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { AttendanceRecord, UserProfile } from "../types";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

interface ExportExcelProps {
  employees: UserProfile[];
}

export default function ExportExcel({ employees }: ExportExcelProps) {
  const [exportType, setExportType] = useState<"daily" | "monthly" | "custom" | "office" | "employee">("daily");
  
  // States for filter inputs
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedOffice, setSelectedOffice] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [recordCount, setRecordCount] = useState<number | null>(null);

  // Distinct office list compiled from registered employees
  const offices = Array.from(new Set(employees.map(e => e.officeName).filter(Boolean)));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" }
  ];

  const handleExport = async () => {
    setExporting(true);
    setExportSuccess(false);
    setRecordCount(null);

    try {
      let q = collection(db, "attendance");
      let conditions: any[] = [];

      // Build Query conditions based on selection
      if (exportType === "daily") {
        conditions.push(where("date", "==", selectedDate));
      } else if (exportType === "monthly") {
        const monthStr = String(selectedMonth).padStart(2, "0");
        const monthPrefix = `${selectedYear}-${monthStr}`;
        // Firestore doesn't easily support startsWith, so we query and filter in memory or fetch all for that year
        // Since we're client-side, fetching year and filtering is safest, or simply filtering in-memory:
        // Actually, let's query all or by year. But we can also query date >= monthPrefix-01 and date <= monthPrefix-31
        conditions.push(where("date", ">=", `${monthPrefix}-01`));
        conditions.push(where("date", "<=", `${monthPrefix}-31`));
      } else if (exportType === "custom") {
        conditions.push(where("date", ">=", startDate));
        conditions.push(where("date", "<=", endDate));
      } else if (exportType === "office") {
        if (selectedOffice) {
          conditions.push(where("officeName", "==", selectedOffice));
        }
      } else if (exportType === "employee") {
        if (selectedEmployeeId) {
          conditions.push(where("userId", "==", selectedEmployeeId));
        }
      }

      // Fetch from Firestore
      const queryInstance = conditions.length > 0 ? query(q, ...conditions) : q;
      const snap = await getDocs(queryInstance);
      const rawRecords: AttendanceRecord[] = [];
      snap.forEach(doc => {
        rawRecords.push({ attendanceId: doc.id, ...doc.data() } as AttendanceRecord);
      });

      if (rawRecords.length === 0) {
        throw new Error("No attendance records found matching the selected filters.");
      }

      // Map to Excel-friendly Columns
      const excelRows = rawRecords.map(rec => {
        // Find employee district if possible
        const emp = employees.find(e => e.userId === rec.userId || e.uid === rec.uid);
        const district = emp?.district || "N/A";
        
        // Compute Status
        let status = "Present";
        if (rec.checkInTime && !rec.checkOutTime) status = "Only Checked-In";
        else if (rec.checkInTime && rec.checkOutTime) status = "Checked-Out (Complete)";

        return {
          "Date (YYYY-MM-DD)": rec.date,
          "Employee Name": rec.employeeName,
          "User ID (Username)": rec.userId,
          "Office Name (Deputed)": rec.officeName,
          "District": district,
          "Check-In Time": rec.checkInTime || "-",
          "Check-Out Time": rec.checkOutTime || "-",
          "Check-In Latitude": rec.checkInLatitude || "-",
          "Check-In Longitude": rec.checkInLongitude || "-",
          "Check-Out Latitude": rec.checkOutLatitude || "-",
          "Check-Out Longitude": rec.checkOutLongitude || "-",
          "GPS Accuracy (m)": rec.gpsAccuracy || "-",
          "Attendance Status": status
        };
      });

      // Export using sheetjs
      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Census Attendance");

      // Set column widths for polished presentation
      const colWidths = [
        { wch: 15 }, // Date
        { wch: 25 }, // Employee Name
        { wch: 15 }, // User ID
        { wch: 30 }, // Office Name
        { wch: 15 }, // District
        { wch: 15 }, // Check-In Time
        { wch: 15 }, // Check-Out Time
        { wch: 18 }, // Check-In Latitude
        { wch: 18 }, // Check-In Longitude
        { wch: 18 }, // Check-Out Latitude
        { wch: 18 }, // Check-Out Longitude
        { wch: 18 }, // GPS Accuracy
        { wch: 22 }  // Attendance Status
      ];
      worksheet["!cols"] = colWidths;

      // Filename construction
      let fileName = `Census_Attendance_${exportType}`;
      if (exportType === "daily") fileName += `_${selectedDate}`;
      else if (exportType === "monthly") fileName += `_${selectedYear}_${selectedMonth}`;
      else if (exportType === "office") fileName += `_${selectedOffice.replace(/\s+/g, "_")}`;
      else if (exportType === "employee") fileName += `_${selectedEmployeeId}`;

      XLSX.writeFile(workbook, `${fileName}.xlsx`);
      
      setRecordCount(rawRecords.length);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to export data.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-[#111114] border border-slate-800 rounded-2xl p-6 shadow-xs max-w-xl mx-auto text-slate-200">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
        <FileSpreadsheet className="h-5.5 w-5.5 text-emerald-400" />
        <div>
          <h3 className="font-display font-semibold text-white text-base">Export Attendance to Excel</h3>
          <p className="text-xs text-slate-400">Download formatted Excel reports containing complete attendance metrics</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Export Type Tabs */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-2">Select Export Scope</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 bg-[#1A1A1F] border border-slate-850 rounded-xl text-xs font-medium">
            <button
              onClick={() => { setExportType("daily"); setRecordCount(null); }}
              className={`py-1.5 px-2.5 rounded-lg text-center transition-all cursor-pointer ${exportType === "daily" ? "bg-[#111114] text-indigo-400 border border-slate-800 font-semibold shadow-xs" : "text-slate-400 hover:text-white"}`}
            >
              Daily
            </button>
            <button
              onClick={() => { setExportType("monthly"); setRecordCount(null); }}
              className={`py-1.5 px-2.5 rounded-lg text-center transition-all cursor-pointer ${exportType === "monthly" ? "bg-[#111114] text-indigo-400 border border-slate-800 font-semibold shadow-xs" : "text-slate-400 hover:text-white"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => { setExportType("custom"); setRecordCount(null); }}
              className={`py-1.5 px-2.5 rounded-lg text-center transition-all cursor-pointer ${exportType === "custom" ? "bg-[#111114] text-indigo-400 border border-slate-800 font-semibold shadow-xs" : "text-slate-400 hover:text-white"}`}
            >
              Range
            </button>
            <button
              onClick={() => { setExportType("office"); setRecordCount(null); }}
              className={`py-1.5 px-2.5 rounded-lg text-center transition-all cursor-pointer ${exportType === "office" ? "bg-[#111114] text-indigo-400 border border-slate-800 font-semibold shadow-xs" : "text-slate-400 hover:text-white"}`}
            >
              Office
            </button>
            <button
              onClick={() => { setExportType("employee"); setRecordCount(null); }}
              className={`py-1.5 px-2.5 rounded-lg text-center transition-all cursor-pointer ${exportType === "employee" ? "bg-[#111114] text-indigo-400 border border-slate-800 font-semibold shadow-xs" : "text-slate-400 hover:text-white"}`}
            >
              Employee
            </button>
          </div>
        </div>

        {/* Dynamic Filters depending on Tab */}
        <div className="bg-[#1A1A1F] p-4 rounded-xl border border-slate-800 animate-fade-in text-sm">
          {exportType === "daily" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-400" />
                Select Specific Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-[#111114] border border-slate-800 rounded-lg focus:outline-hidden focus:border-indigo-550 transition-all text-slate-200"
              />
            </div>
          )}

          {exportType === "monthly" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="px-3 py-2 bg-[#111114] border border-slate-800 rounded-lg text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value} className="bg-[#111114]">{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="px-3 py-2 bg-[#111114] border border-slate-800 rounded-lg text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  {years.map(y => (
                    <option key={y} value={y} className="bg-[#111114]">{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {exportType === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 bg-[#111114] border border-slate-800 rounded-lg text-slate-200 focus:outline-hidden"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-[#111114] border border-slate-800 rounded-lg text-slate-200 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {exportType === "office" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Building className="h-4 w-4 text-indigo-400" />
                Select Deputed Office
              </label>
              <select
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
                className="px-3 py-2 bg-[#111114] border border-slate-800 rounded-lg text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="" className="bg-[#111114]">-- Select Government Office --</option>
                {offices.map(o => (
                  <option key={o} value={o} className="bg-[#111114]">{o}</option>
                ))}
              </select>
            </div>
          )}

          {exportType === "employee" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-400" />
                Select TA Employee
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-3 py-2 bg-[#111114] border border-slate-800 rounded-lg text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="" className="bg-[#111114]">-- Select Employee --</option>
                {employees.map(e => (
                  <option key={e.userId} value={e.userId} className="bg-[#111114]">
                    {e.employeeName} ({e.userId}) — {e.officeName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Status indicator on success */}
        {exportSuccess && (
          <div className="bg-emerald-950/20 border border-emerald-900/40 p-3.5 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>
              <strong>Excel Download Complete!</strong> Successfully extracted {recordCount} records.
            </span>
          </div>
        )}

        {/* Submit Export */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-950/30 transition-all cursor-pointer"
        >
          {exporting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Generating Excel Sheet...
            </>
          ) : (
            <>
              <Download className="h-4.5 w-4.5" />
              Download Excel Report (.xlsx)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
