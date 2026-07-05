import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Users, UserPlus, FileSpreadsheet, Clock, Search, ShieldCheck, 
  Trash2, RefreshCw, Eye, Landmark, Settings, AlertCircle, CheckCircle, 
  Building, MapPin, ListCollapse, LogOut, Check, X, ShieldAlert, Key, ClipboardList
} from "lucide-react";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { UserProfile, AttendanceRecord, AuditLog } from "../types";
import { formatCurrentTime } from "../utils/censusHelpers";
import RegisterEmployeeModal from "../components/RegisterEmployeeModal";
import ExportExcel from "../components/ExportExcel";
import AdminTimingsSettings from "../components/AdminTimingsSettings";
import ConfirmationDialog from "../components/ConfirmationDialog";
import FieldWorkerMap from "../components/FieldWorkerMap";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function AdminDashboard() {
  const { userProfile, logout, registerEmployee, updateEmployeeProfile, deleteEmployeeAccount, resetEmployeePassword, updateSettings, systemSettings, logAdminAction } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"overview" | "employees" | "attendance" | "settings" | "export" | "logs">("overview");

  // State collections
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [allAdmins, setAllAdmins] = useState<UserProfile[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter states for Employee Management
  const [searchQuery, setSearchQuery] = useState("");
  const [officeFilter, setOfficeFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");

  // Filter states for Attendance Monitoring
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceOffice, setAttendanceOffice] = useState("");
  const [attendanceDistrict, setAttendanceDistrict] = useState("");

  // Modal / Interaction states
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);
  
  // Custom dialog confirmations
  const [confirmDelete, setConfirmDelete] = useState<{ userId: string; uid: string } | null>(null);
  const [confirmPasswordReset, setConfirmPasswordReset] = useState<{ userId: string; uid: string; name: string } | null>(null);
  const [resetCredentialsResult, setResetCredentialsResult] = useState<{ userId: string; pass: string; name: string } | null>(null);
  const [confirmDeleteAttendance, setConfirmDeleteAttendance] = useState<AttendanceRecord | null>(null);

  // Status updates info
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetching data
  const loadAllData = async () => {
    try {
      setRefreshing(true);
      setErrorMsg("");

      // 1. Fetch Users
      const usersSnap = await getDocs(collection(db, "users"));
      const empsList: UserProfile[] = [];
      const adminsList: UserProfile[] = [];
      usersSnap.forEach(doc => {
        const u = doc.data() as UserProfile;
        if (u.role === "employee") empsList.push(u);
        else adminsList.push(u);
      });
      setEmployees(empsList);
      setAllAdmins(adminsList);

      // 2. Fetch Attendances for selected date
      const attSnap = await getDocs(collection(db, "attendance"));
      const attList: AttendanceRecord[] = [];
      attSnap.forEach(doc => {
        attList.push({ attendanceId: doc.id, ...doc.data() } as AttendanceRecord);
      });
      setAttendances(attList);

      // 3. Fetch Audit Logs
      const logsSnap = await getDocs(collection(db, "audit_logs"));
      const logsList: AuditLog[] = [];
      logsSnap.forEach(doc => {
        logsList.push(doc.data() as AuditLog);
      });
      // Sort logs newest first
      logsList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setAuditLogs(logsList);

    } catch (err: any) {
      console.error("Failed to fetch admin dashboard records:", err);
      setErrorMsg("Error synchronizing cloud Firestore documents: " + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!userProfile) {
      navigate("/login");
      return;
    }
    if (userProfile.role !== "super_admin" && userProfile.role !== "admin") {
      navigate("/employee");
      return;
    }
    loadAllData();
  }, [userProfile]);

  // Statistics Computations
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === "Active").length;
  const inactiveEmployees = employees.filter(e => e.status === "Inactive").length;

  const todayDateStr = formatCurrentTime().dateStr;
  const todayAttendances = attendances.filter(a => a.date === todayDateStr);
  
  const leavesTodayCount = todayAttendances.filter(a => a.isLeave).length;
  const presentTodayCount = todayAttendances.filter(a => !a.isLeave).length;
  const checkedInCount = todayAttendances.filter(a => !a.isLeave && a.checkInTime && !a.checkOutTime).length;
  const checkedOutCount = todayAttendances.filter(a => !a.isLeave && a.checkInTime && a.checkOutTime).length;
  const absentTodayCount = Math.max(0, activeEmployees - presentTodayCount - leavesTodayCount);

  // Filter lists compiled dynamically
  const officesList = Array.from(new Set(employees.map(e => e.officeName).filter(Boolean)));
  const districtsList = Array.from(new Set(employees.map(e => e.district).filter(Boolean)));

  // Employee management filter results
  const filteredEmployees = employees.filter(e => {
    const matchSearch = 
      e.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.userId.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (e.mobile && e.mobile.includes(searchQuery));
    const matchOffice = !officeFilter || e.officeName === officeFilter;
    const matchDistrict = !districtFilter || e.district === districtFilter;
    return matchSearch && matchOffice && matchDistrict;
  });

  // Attendance monitoring filter results
  const filteredAttendances = attendances.filter(a => {
    const matchDate = a.date === attendanceDate;
    const matchOffice = !attendanceOffice || a.officeName === attendanceOffice;
    
    // Cross check district from cached employee profile
    const emp = employees.find(e => e.userId === a.userId || e.uid === a.uid);
    const matchDistrict = !attendanceDistrict || emp?.district === attendanceDistrict;
    
    return matchDate && matchOffice && matchDistrict;
  });

  const handleToggleStatus = async (employee: UserProfile) => {
    setErrorMsg("");
    setStatusMsg("");
    const nextStatus = employee.status === "Active" ? "Inactive" : "Active";
    try {
      await updateEmployeeProfile(employee.uid, { status: nextStatus });
      setStatusMsg(`Updated status for ${employee.employeeName} to ${nextStatus}.`);
      loadAllData();
    } catch (e: any) {
      setErrorMsg("Failed to toggle status: " + e.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setErrorMsg("");
    setStatusMsg("");
    try {
      await deleteEmployeeAccount(confirmDelete.userId, confirmDelete.uid);
      setStatusMsg(`Permanently deleted employee profile: ${confirmDelete.userId}`);
      setConfirmDelete(null);
      loadAllData();
    } catch (e: any) {
      setErrorMsg("Failed to delete account: " + e.message);
      setConfirmDelete(null);
    }
  };

  const handleDeleteAttendanceConfirm = async () => {
    if (!confirmDeleteAttendance) return;
    setErrorMsg("");
    setStatusMsg("");
    const path = `attendance/${confirmDeleteAttendance.attendanceId}`;
    
    try {
      await deleteDoc(doc(db, "attendance", confirmDeleteAttendance.attendanceId));
      
      try {
        await logAdminAction(
          "Delete Attendance Record",
          `Deleted attendance log for ${confirmDeleteAttendance.employeeName} (${confirmDeleteAttendance.userId}) on date ${confirmDeleteAttendance.date}`
        );
      } catch (logErr) {
        console.error("Failed to log attendance deletion audit log:", logErr);
      }

      setStatusMsg(`Successfully deleted attendance record for ${confirmDeleteAttendance.employeeName}`);
      setConfirmDeleteAttendance(null);
      loadAllData();
    } catch (e: any) {
      setConfirmDeleteAttendance(null);
      try {
        handleFirestoreError(e, OperationType.DELETE, path);
      } catch (thrownError: any) {
        setErrorMsg("Failed to delete attendance record: " + thrownError.message);
      }
    }
  };

  const handleResetPasswordConfirm = async () => {
    if (!confirmPasswordReset) return;
    setErrorMsg("");
    setStatusMsg("");
    
    // Generate secure temporary password
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!%*?&";
    let generatedPass = "";
    // Let's use the format Ab@12345
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const spec = "@#$!%*&";
    const digits = "0123456789";
    generatedPass += upper.charAt(Math.floor(Math.random() * upper.length));
    generatedPass += lower.charAt(Math.floor(Math.random() * lower.length));
    generatedPass += spec.charAt(Math.floor(Math.random() * spec.length));
    for (let i = 0; i < 5; i++) {
      generatedPass += digits.charAt(Math.floor(Math.random() * digits.length));
    }

    try {
      await resetEmployeePassword(confirmPasswordReset.userId, confirmPasswordReset.uid, generatedPass);
      setResetCredentialsResult({
        userId: confirmPasswordReset.userId,
        pass: generatedPass,
        name: confirmPasswordReset.name
      });
      setConfirmPasswordReset(null);
      loadAllData();
    } catch (e: any) {
      setErrorMsg("Failed to reset password: " + e.message);
      setConfirmPasswordReset(null);
    }
  };

  const handleInlineEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setErrorMsg("");
    setStatusMsg("");

    try {
      await updateEmployeeProfile(editingEmployee.uid, {
        employeeName: editingEmployee.employeeName,
        fatherName: editingEmployee.fatherName,
        dob: editingEmployee.dob,
        mobile: editingEmployee.mobile,
        email: editingEmployee.email,
        designation: editingEmployee.designation,
        officeName: editingEmployee.officeName,
        district: editingEmployee.district,
        joiningDate: editingEmployee.joiningDate
      });
      setStatusMsg(`Successfully saved details for ${editingEmployee.employeeName}`);
      setEditingEmployee(null);
      loadAllData();
    } catch (err: any) {
      setErrorMsg("Failed to update: " + err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-4">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-sm font-semibold text-slate-400">Verifying Administrative Privileges...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 pb-16 font-sans">
      
      {/* Top Government Title Header */}
      <header className="bg-[#111114] text-white border-b border-slate-800 shadow-md py-4 px-6 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1A1A1F] rounded-lg border border-slate-800">
              <Landmark className="h-5.5 w-5.5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-display font-bold text-sm sm:text-base tracking-tight uppercase">Census of India 2027</h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">National Control & Administrative Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right text-xs">
              <span className="block text-slate-400 font-medium">Logged in as {userProfile?.employeeName}</span>
              <span className="inline-block text-[10px] font-bold text-indigo-400 bg-indigo-950/30 border border-indigo-900/50 px-2 py-0.5 rounded uppercase mt-0.5 tracking-wider">
                {userProfile?.role === "super_admin" ? "National Coordinator" : "District Admin"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold rounded-lg transition-all border border-red-900/50 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-red-400" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Tab Navigation */}
      <div className="bg-[#111114] border-b border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-6 overflow-x-auto flex gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3.5 border-b-2 px-1 cursor-pointer transition-all ${activeTab === "overview" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent hover:text-white"}`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`py-3.5 border-b-2 px-1 cursor-pointer transition-all ${activeTab === "employees" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent hover:text-white"}`}
          >
            Employee Management
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`py-3.5 border-b-2 px-1 cursor-pointer transition-all ${activeTab === "attendance" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent hover:text-white"}`}
          >
            Attendance Monitoring
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-3.5 border-b-2 px-1 cursor-pointer transition-all ${activeTab === "settings" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent hover:text-white"}`}
          >
            Timing Settings
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`py-3.5 border-b-2 px-1 cursor-pointer transition-all ${activeTab === "export" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent hover:text-white"}`}
          >
            Excel Reporting
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`py-3.5 border-b-2 px-1 cursor-pointer transition-all ${activeTab === "logs" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent hover:text-white"}`}
          >
            System Audit Logs
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 mt-6">
        
        {/* Status Alerts banner */}
        {(statusMsg || errorMsg) && (
          <div className="mb-5 space-y-2 no-print">
            {statusMsg && (
              <div className="bg-emerald-950/20 border border-emerald-900/50 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  <span>{statusMsg}</span>
                </div>
                <button onClick={() => setStatusMsg("")} className="text-emerald-500 hover:text-emerald-400 font-bold">X</button>
              </div>
            )}
            {errorMsg && (
              <div className="bg-red-950/20 border border-red-900/50 text-red-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
                <button onClick={() => setErrorMsg("")} className="text-red-500 hover:text-red-400 font-bold">X</button>
              </div>
            )}
          </div>
        )}

        {/* Password Reset Credential Result Alert Overlay */}
        {resetCredentialsResult && (
          <div className="bg-[#1A1A1F] border border-slate-850 rounded-2xl p-5 mb-6 text-sm text-slate-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-scale-up no-print">
            <div className="space-y-1 flex-1">
              <div className="flex gap-2 items-center text-indigo-400 font-bold">
                <Key className="h-5 w-5" />
                <span>Password Reset Successfully Completed!</span>
              </div>
              <p className="text-xs text-slate-400">The temporary password has been saved for employee: <strong>{resetCredentialsResult.name}</strong></p>
              <div className="grid grid-cols-2 bg-[#0A0A0B]/60 p-3 rounded-xl border border-slate-800 text-xs font-mono mt-3 max-w-sm">
                <span>User ID: <strong className="text-indigo-400">{resetCredentialsResult.userId}</strong></span>
                <span>Temp Pass: <strong className="text-emerald-400">{resetCredentialsResult.pass}</strong></span>
              </div>
            </div>
            <button
              onClick={() => setResetCredentialsResult(null)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              Clear Result
            </button>
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in no-print">
            
            {/* Quick Action Top bar */}
            <div className="flex justify-between items-center bg-[#111114] border border-slate-800 p-4 rounded-2xl shadow-xs">
              <div>
                <h2 className="font-display font-bold text-white text-base">Census Operations Pulse</h2>
                <p className="text-xs text-slate-400">Real-time counts for Active Technical Assistants</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadAllData}
                  disabled={refreshing}
                  className="p-2.5 bg-[#1A1A1F] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-indigo-500" : ""}`} />
                  Sync Database
                </button>
                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-indigo-900/10 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  Register Employee
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="block text-slate-500 font-mono text-[9px] uppercase tracking-wider font-bold">Total Staff Enrolled</span>
                <span className="block text-3xl font-display font-bold text-white mt-1">{totalEmployees}</span>
                <span className="text-[10px] text-slate-500 mt-2 block">All registered Technical Assistants</span>
              </div>
              
              <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="block text-slate-500 font-mono text-[9px] uppercase tracking-wider font-bold">Active Staff Users</span>
                <span className="block text-3xl font-display font-bold text-emerald-400 mt-1">{activeEmployees}</span>
                <span className="text-[10px] text-slate-500 mt-2 block">{inactiveEmployees} Inactive users blocked</span>
              </div>

              <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="block text-emerald-500 font-mono text-[9px] uppercase tracking-wider font-bold">Present Today</span>
                <span className="block text-3xl font-display font-bold text-white mt-1">{presentTodayCount}</span>
                <span className="text-[10px] text-emerald-500 mt-2 block font-semibold">{checkedOutCount} Checked-Out complete</span>
              </div>

              <div className="bg-[#111114] border border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="block text-amber-500 font-mono text-[9px] uppercase tracking-wider font-bold">Absent Today</span>
                <span className="block text-3xl font-display font-bold text-white mt-1">{absentTodayCount}</span>
                <span className="text-[10px] text-amber-500 mt-2 block font-semibold">
                  {checkedInCount} Checked-In • <span className="text-amber-400 font-bold">{leavesTodayCount} on Leave</span>
                </span>
              </div>
            </div>

            {/* Quick Status Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Daily Control Stats */}
              <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 shadow-xs">
                <h3 className="font-display font-semibold text-white text-sm border-b border-slate-800 pb-2.5 mb-3 flex items-center justify-between">
                  <span>Present Staff Daily Roll</span>
                  <span className="text-xs text-slate-500 font-mono font-medium">{todayDateStr}</span>
                </h3>
                {todayAttendances.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No present logs recorded for today yet.</p>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {todayAttendances.map(a => (
                      <div key={a.attendanceId} className="flex justify-between items-center p-2.5 bg-[#1A1A1F] border border-slate-800 rounded-xl text-xs">
                        <div>
                          <strong className="text-slate-200 block">{a.employeeName}</strong>
                          <span className="text-slate-500 text-[10px] block">{a.officeName}</span>
                        </div>
                        <div className="text-right font-mono text-slate-400 text-[10px] space-y-0.5">
                          {a.isLeave ? (
                            <span className="font-semibold text-amber-500 bg-amber-950/20 border border-amber-900/40 px-2 py-0.5 rounded">ON LEAVE</span>
                          ) : (
                            <>
                              <div>IN: <span className="font-semibold text-emerald-400">{a.checkInTime}</span></div>
                              {a.checkOutTime && <div>OUT: <span className="font-semibold text-indigo-400">{a.checkOutTime}</span></div>}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Active Staff Summary List */}
              <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 shadow-xs">
                <h3 className="font-display font-semibold text-white text-sm border-b border-slate-800 pb-2.5 mb-3">
                  Government Deputed Offices Distribution
                </h3>
                {employees.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No employee records registered in system.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {officesList.map(off => {
                      const count = employees.filter(e => e.officeName === off).length;
                      const activeInOffice = employees.filter(e => e.officeName === off && e.status === "Active").length;
                      return (
                        <div key={off} className="flex justify-between items-center p-2.5 bg-[#1A1A1F] border border-slate-800 rounded-xl text-xs">
                          <div>
                            <strong className="text-slate-200 block">{off}</strong>
                            <span className="text-slate-500 text-[10px] block">Deputed Area</span>
                          </div>
                          <span className="font-bold text-slate-200 text-sm bg-[#111114] border border-slate-800 px-2.5 py-0.5 rounded-lg">
                            {activeInOffice} / {count} <span className="text-[10px] font-medium text-slate-500">Active</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 2. EMPLOYEE MANAGEMENT TAB */}
        {activeTab === "employees" && (
          <div className="space-y-5 animate-fade-in no-print">
            
            {/* Filter Bar */}
            <div className="bg-[#111114] border border-slate-800 p-4 rounded-2xl shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by Name, User ID or Mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900/50 transition-all text-slate-200 font-medium"
                />
              </div>

              <div>
                <select
                  value={officeFilter}
                  onChange={(e) => setOfficeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-xs focus:outline-hidden text-slate-300 font-medium cursor-pointer"
                >
                  <option value="" className="bg-[#111114]">All Deputed Offices</option>
                  {officesList.map(o => <option key={o} value={o} className="bg-[#111114]">{o}</option>)}
                </select>
              </div>

              <div>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-xs focus:outline-hidden text-slate-300 font-medium cursor-pointer"
                >
                  <option value="" className="bg-[#111114]">All Districts</option>
                  {districtsList.map(d => <option key={d} value={d} className="bg-[#111114]">{d}</option>)}
                </select>
              </div>
            </div>

            {/* List and Inline Editor */}
            {editingEmployee ? (
              /* Inline Edit Mode Form */
              <form onSubmit={handleInlineEditSave} className="bg-[#111114] border border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 animate-scale-up">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                  <h3 className="font-display font-semibold text-white text-sm flex items-center gap-1.5">
                    <Settings className="h-4.5 w-4.5 text-indigo-400" />
                    Modify Employee Details: <span className="text-indigo-400 font-bold">{editingEmployee.userId}</span>
                  </h3>
                  <button type="button" onClick={() => setEditingEmployee(null)} className="p-1 rounded-lg hover:bg-slate-800 cursor-pointer">
                    <X className="h-4.5 w-4.5 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-400">
                  <div className="flex flex-col gap-1">
                    <label>Employee Full Name</label>
                    <input
                      type="text"
                      value={editingEmployee.employeeName}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, employeeName: e.target.value })}
                      required
                      className="p-2 bg-[#1A1A1F] border border-slate-800 rounded-xl focus:outline-hidden text-slate-200 focus:bg-slate-900/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>Father's Name</label>
                    <input
                      type="text"
                      value={editingEmployee.fatherName || ""}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, fatherName: e.target.value })}
                      required
                      className="p-2 bg-[#1A1A1F] border border-slate-800 rounded-xl focus:outline-hidden text-slate-200 focus:bg-slate-900/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={editingEmployee.dob || ""}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, dob: e.target.value })}
                      required
                      className="p-2 bg-[#1A1A1F] border border-slate-800 rounded-xl focus:outline-hidden text-slate-200 focus:bg-slate-900/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>Mobile Number</label>
                    <input
                      type="tel"
                      value={editingEmployee.mobile || ""}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, mobile: e.target.value })}
                      required
                      className="p-2 bg-[#1A1A1F] border border-slate-800 rounded-xl focus:outline-hidden text-slate-200 focus:bg-slate-900/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={editingEmployee.email || ""}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                      className="p-2 bg-[#1A1A1F] border border-slate-800 rounded-xl focus:outline-hidden text-slate-200 focus:bg-slate-900/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>Designation</label>
                    <input
                      type="text"
                      value={editingEmployee.designation || ""}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, designation: e.target.value })}
                      className="p-2 bg-[#1A1A1F] border border-slate-800 rounded-xl focus:outline-hidden text-slate-200 focus:bg-slate-900/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>Deputed Office Name</label>
                    <input
                      type="text"
                      value={editingEmployee.officeName || ""}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, officeName: e.target.value })}
                      className="p-2 bg-[#1A1A1F] border border-slate-800 rounded-xl focus:outline-hidden text-slate-200 focus:bg-slate-900/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>District Area</label>
                    <input
                      type="text"
                      value={editingEmployee.district || ""}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, district: e.target.value })}
                      className="p-2 bg-[#1A1A1F] border border-slate-800 rounded-xl focus:outline-hidden text-slate-200 focus:bg-slate-900/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    className="px-4 py-2 bg-[#1A1A1F] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md cursor-pointer"
                  >
                    Save Modifications
                  </button>
                </div>
              </form>
            ) : (
              /* Records Table View */
              <div className="bg-[#111114] border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#1A1A1F] border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4">User ID / Name</th>
                      <th className="py-3 px-4">Father / DOB</th>
                      <th className="py-3 px-4">Contact / Email</th>
                      <th className="py-3 px-4">Deputed Location</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">No matching registered employees located.</td>
                      </tr>
                    ) : (
                      filteredEmployees.map(emp => (
                        <tr key={emp.uid} className="hover:bg-slate-800/10 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] font-bold text-indigo-400 block">{emp.userId}</span>
                            <span className="font-semibold text-white block mt-0.5">{emp.employeeName}</span>
                          </td>
                          <td className="py-3 px-4 space-y-0.5">
                            <div className="text-slate-400 font-medium">F: {emp.fatherName || "N/A"}</div>
                            <div className="font-mono text-[10px] text-slate-500">DOB: {emp.dob}</div>
                          </td>
                          <td className="py-3 px-4 space-y-0.5">
                            <div className="text-slate-300 font-mono font-semibold">{emp.mobile}</div>
                            <div className="text-slate-500 max-w-xs truncate font-mono text-[10px]">{emp.email || "No Email"}</div>
                          </td>
                          <td className="py-3 px-4 space-y-0.5">
                            <div className="text-slate-300 font-medium leading-tight">{emp.officeName}</div>
                            <div className="text-slate-500 font-mono text-[10px]">{emp.district}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                                emp.status === "Active" 
                                  ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-950/45" 
                                  : "bg-red-950/20 text-red-400 border border-red-900/40 hover:bg-red-950/45"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${emp.status === "Active" ? "bg-emerald-500" : "bg-red-500"}`} />
                              {emp.status}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-1.5 justify-end items-center">
                              <button
                                onClick={() => setEditingEmployee(emp)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-800 cursor-pointer"
                                title="Edit Details"
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmPasswordReset({ userId: emp.userId, uid: emp.uid, name: emp.employeeName })}
                                className="p-1.5 hover:bg-slate-800 text-amber-500 hover:text-amber-400 rounded-lg transition-colors border border-slate-800 cursor-pointer"
                                title="Reset Password"
                              >
                                <Key className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete({ userId: emp.userId, uid: emp.uid })}
                                className="p-1.5 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-slate-800 cursor-pointer"
                                title="Delete Profile"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* 3. ATTENDANCE MONITORING TAB */}
        {activeTab === "attendance" && (
          <div className="space-y-5 animate-fade-in text-slate-200">
            
            {/* Filter controls */}
            <div className="bg-[#111114] border border-slate-800 p-4 rounded-2xl shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Selected Log Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Deputed Office filter</label>
                <select
                  value={attendanceOffice}
                  onChange={(e) => setAttendanceOffice(e.target.value)}
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden cursor-pointer font-medium"
                >
                  <option value="" className="bg-[#111114]">All Government Offices</option>
                  {officesList.map(o => <option key={o} value={o} className="bg-[#111114]">{o}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">District Region filter</label>
                <select
                  value={attendanceDistrict}
                  onChange={(e) => setAttendanceDistrict(e.target.value)}
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden cursor-pointer font-medium"
                >
                  <option value="" className="bg-[#111114]">All District Regions</option>
                  {districtsList.map(d => <option key={d} value={d} className="bg-[#111114]">{d}</option>)}
                </select>
              </div>
            </div>

            {/* Print trigger */}
            <div className="flex justify-end no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#111114] hover:bg-[#1A1A1F] border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Print Report
              </button>
            </div>

            {/* Live GPS Distribution Map */}
            <div className="no-print">
              <FieldWorkerMap attendances={filteredAttendances} />
            </div>

            {/* Log monitoring tables */}
            <div className="bg-[#111114] border border-slate-800 rounded-2xl overflow-hidden shadow-xs print-card">
              <div className="p-4 bg-[#1A1A1F] border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="font-display font-bold text-white text-sm">Census TA Daily Logs Summary</h4>
                  <p className="text-[10px] text-slate-500">Showing logs for Date: {attendanceDate}</p>
                </div>
                <span className="font-mono text-xs font-bold text-indigo-400 bg-[#111114] border border-slate-800 px-2 py-0.5 rounded-lg">
                  Count: {filteredAttendances.length} present
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1A1A1F] border-b border-slate-800 text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                      <th className="py-3 px-4">Employee / ID</th>
                      <th className="py-3 px-4">Deputed Office</th>
                      <th className="py-3 px-4">Check-In Log</th>
                      <th className="py-3 px-4">Check-Out Log</th>
                      <th className="py-3 px-4">GPS coordinates (Accuracy)</th>
                      <th className="py-3 px-4">Device / Browser</th>
                      <th className="py-3 px-4 text-right no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-[11px] text-slate-300">
                    {filteredAttendances.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500 font-medium">No present attendance logs found for this filter selection.</td>
                      </tr>
                    ) : (
                      filteredAttendances.map(a => (
                        <tr key={a.attendanceId} className="hover:bg-slate-800/10 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">{a.employeeName}</span>
                            <span className="font-mono text-[10px] text-slate-500 block mt-0.5">{a.userId}</span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-300 leading-tight">
                            {a.officeName}
                          </td>
                          <td className="py-3 px-4">
                            {a.isLeave ? (
                              <span className="font-semibold text-amber-500 bg-amber-950/20 border border-amber-900/40 px-2 py-1 rounded-lg uppercase">On Leave</span>
                            ) : (
                              <div className="flex gap-2 items-center">
                                {a.checkInPhoto && (
                                  <img
                                    src={a.checkInPhoto}
                                    alt="Checkin ID"
                                    className="h-10 w-10 rounded-lg object-cover border border-slate-800 shadow-sm shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <span className="font-mono font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-2 py-0.5 rounded">{a.checkInTime}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {a.isLeave ? (
                              <span className="text-slate-400 font-medium italic">{a.leaveReason || "Casual Leave"}</span>
                            ) : a.checkOutTime ? (
                              <div className="flex gap-2 items-center">
                                {a.checkOutPhoto && (
                                  <img
                                    src={a.checkOutPhoto}
                                    alt="Checkout ID"
                                    className="h-10 w-10 rounded-lg object-cover border border-slate-800 shadow-sm shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <span className="font-mono font-bold text-indigo-400 bg-indigo-950/20 border border-indigo-900/40 px-2 py-0.5 rounded">{a.checkOutTime}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 font-mono italic">Not Checked-Out</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] space-y-0.5 text-slate-400">
                            {a.isLeave ? (
                              <span className="text-slate-500 italic">No GPS Data (Off-duty)</span>
                            ) : (
                              <>
                                <div>IN: {a.checkInLatitude?.toFixed(5)}, {a.checkInLongitude?.toFixed(5)}</div>
                                {a.checkOutLatitude && (
                                  <div>OUT: {a.checkOutLatitude.toFixed(5)}, {a.checkOutLongitude.toFixed(5)}</div>
                                )}
                                <div className="font-bold text-slate-500 text-[9px]">Acc: ±{a.gpsAccuracy}m</div>
                              </>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                            {a.isLeave ? (
                              <span className="text-slate-500 italic">—</span>
                            ) : (
                              <>
                                <span className="block font-semibold text-slate-300">{a.device}</span>
                                <span className="block mt-0.5">{a.browser}</span>
                              </>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right no-print">
                            <button
                              onClick={() => setConfirmDeleteAttendance(a)}
                              className="p-1.5 hover:bg-red-950/30 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-slate-800 hover:border-red-900/50 cursor-pointer inline-flex items-center justify-center"
                              title="Delete Attendance Log"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 4. CONFIGURABLE TIMING SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="animate-fade-in no-print">
            <AdminTimingsSettings
              currentSettings={systemSettings}
              onSave={updateSettings}
            />
          </div>
        )}

        {/* 5. EXCEL SPREADSHEET EXPORTS TAB */}
        {activeTab === "export" && (
          <div className="animate-fade-in no-print">
            <ExportExcel employees={employees} />
          </div>
        )}

        {/* 6. SYSTEM AUDIT LOGS TAB */}
        {activeTab === "logs" && (
          <div className="bg-[#111114] border border-slate-800 rounded-2xl overflow-hidden shadow-xs animate-fade-in no-print">
            <div className="p-4 bg-[#1A1A1F] border-b border-slate-800">
              <h3 className="font-display font-semibold text-white text-sm flex items-center gap-1.5">
                <ClipboardList className="h-4.5 w-4.5 text-indigo-400" />
                Administrative System Audit Trail
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Immutable trace of user management and system settings adjustments</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1A1A1F] border-b border-slate-800 text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    <th className="py-3 px-4">Log Timestamp</th>
                    <th className="py-3 px-4">Authorized Admin</th>
                    <th className="py-3 px-4">Action Type</th>
                    <th className="py-3 px-4">Action Context details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[10px] text-slate-300">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 font-medium font-sans">No administrative audits logged in current system.</td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.logId} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(log.timestamp).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-sans font-semibold">
                          {log.adminName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-indigo-950/20 border border-indigo-900/40 text-indigo-400 font-bold uppercase tracking-wider text-[9px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-400 max-w-sm truncate leading-tight">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Footer copyright and credit info */}
      <footer className="mt-12 text-center text-slate-600 text-xs font-mono relative z-10 space-y-1 py-6 border-t border-slate-900 max-w-7xl mx-auto px-6 no-print">
        <p>© Census of India 2027 • Ministry of Home Affairs</p>
        <p className="text-[11px] text-slate-500">
          Developed by <span className="text-slate-400 font-semibold">S B Trading & Co</span> • Agency Partner: <span className="text-slate-400 font-semibold">ZAM Enterprise</span>
        </p>
        <p className="text-[10px] text-slate-600">
          All Census TA personnel are deputed from ZAM Enterprise under the Government project
        </p>
      </footer>

      {/* MODALS & OVERLAYS (No-print zones) */}
      <div className="no-print">
        
        {/* Register Employee Modal */}
        <RegisterEmployeeModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          onRegister={registerEmployee}
        />

        {/* Delete Confirmation */}
        <ConfirmationDialog
          isOpen={!!confirmDelete}
          title="Delete Employee Profile"
          message={`Are you absolutely sure you want to permanently delete the profile for user: ${confirmDelete?.userId}? This will revoke login privileges and delete all biographical data.`}
          confirmLabel="Delete Permanently"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
          severity="danger"
        />

        {/* Password Reset Confirmation */}
        <ConfirmationDialog
          isOpen={!!confirmPasswordReset}
          title="Reset Password Confirmation"
          message={`Are you sure you want to reset the login password for ${confirmPasswordReset?.name} (${confirmPasswordReset?.userId})? A secure temporary password will be generated.`}
          confirmLabel="Reset Password"
          onConfirm={handleResetPasswordConfirm}
          onCancel={() => setConfirmPasswordReset(null)}
          severity="warning"
        />

        {/* Delete Attendance Log Confirmation */}
        <ConfirmationDialog
          isOpen={!!confirmDeleteAttendance}
          title="Delete Attendance Log"
          message={`Are you sure you want to permanently delete the attendance log for ${confirmDeleteAttendance?.employeeName} (${confirmDeleteAttendance?.userId}) on ${confirmDeleteAttendance?.date}? This will remove the check-in and check-out logs and erase all coordinates.`}
          confirmLabel="Delete Log"
          onConfirm={handleDeleteAttendanceConfirm}
          onCancel={() => setConfirmDeleteAttendance(null)}
          severity="danger"
        />

      </div>

    </div>
  );
}
