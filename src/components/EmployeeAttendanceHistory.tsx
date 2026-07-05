import React, { useState } from "react";
import { Filter, Calendar, Info, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { AttendanceRecord } from "../types";

interface EmployeeAttendanceHistoryProps {
  attendanceHistory: AttendanceRecord[];
}

export default function EmployeeAttendanceHistory({ attendanceHistory }: EmployeeAttendanceHistoryProps) {
  const currentYear = new Date().getFullYear();
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 0, label: "All Months" },
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

  // Filtering records based on selection
  const filteredHistory = attendanceHistory.filter(record => {
    // record.date is YYYY-MM-DD
    const parts = record.date.split("-");
    if (parts.length !== 3) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    const matchYear = year === filterYear;
    const matchMonth = filterMonth === 0 || month === filterMonth;
    
    return matchYear && matchMonth;
  });

  return (
    <div className="bg-[#111114] border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
      
      {/* Title & Filters */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-semibold text-white text-base">Attendance Log History</h3>
          <p className="text-xs text-slate-400">View and track your daily check-in and check-out logs</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2.5 items-center bg-[#1A1A1F] p-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          
          {/* Month Filter */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(parseInt(e.target.value, 10))}
            className="bg-transparent focus:outline-hidden text-slate-200 font-medium cursor-pointer"
          >
            {months.map(m => (
              <option key={m.value} value={m.value} className="bg-[#111114] text-slate-200">{m.label}</option>
            ))}
          </select>
          
          <span className="text-slate-700">|</span>

          {/* Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value, 10))}
            className="bg-transparent focus:outline-hidden text-slate-200 font-medium cursor-pointer"
          >
            {years.map(y => (
              <option key={y} value={y} className="bg-[#111114] text-slate-200">{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        {filteredHistory.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <Calendar className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-slate-400 text-sm font-medium">No attendance records found</p>
            <p className="text-slate-500 text-xs mt-0.5">Adjust your filters or submit a check-in for today.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1A1A1F] border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-5">Office Deputed</th>
                <th className="py-3.5 px-5">Check-In</th>
                <th className="py-3.5 px-5">Check-Out</th>
                <th className="py-3.5 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
              {filteredHistory.map(record => {
                const complete = !!record.checkOutTime;
                
                return (
                  <tr key={record.attendanceId} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-white">
                      {new Date(record.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 max-w-xs truncate">
                      {record.officeName}
                    </td>
                    <td className="py-3.5 px-5">
                      {record.isLeave ? (
                        <span className="text-xs text-amber-500 font-medium">
                          {record.leaveReason || "On Leave"}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span className="font-mono text-xs">{record.checkInTime}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      {record.isLeave ? (
                        <span className="text-xs text-slate-500 font-mono">—</span>
                      ) : record.checkOutTime ? (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span className="font-mono text-xs">{record.checkOutTime}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono italic">Pending Out</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        record.isLeave
                          ? "bg-amber-950/20 text-amber-500 border border-amber-900/40"
                          : complete 
                          ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/40" 
                          : "bg-[#1A1A2F] text-indigo-400 border border-indigo-900/40"
                      }`}>
                        {record.isLeave ? (
                          <>
                            <Calendar className="h-3 w-3 shrink-0 text-amber-500" />
                            Leave
                          </>
                        ) : complete ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                            Completed
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 shrink-0 text-indigo-400" />
                            Checked-In
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Stats Summary Footer */}
      <div className="bg-[#1A1A1F] px-5 py-3 border-t border-slate-800 text-[11px] font-medium text-slate-500 flex justify-between">
        <span>Showing {filteredHistory.length} record(s)</span>
        <span>Census TA Attendance Verification Engine</span>
      </div>
    </div>
  );
}
