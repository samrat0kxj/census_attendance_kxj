import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  LogOut, User, MapPin, Camera, Clock, CheckCircle, AlertTriangle, 
  Navigation, RefreshCw, Calendar, Sparkles, Building, Briefcase, FileText
} from "lucide-react";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { AttendanceRecord } from "../types";
import { formatCurrentTime, getBrowserAndDevice, isTimeBetween } from "../utils/censusHelpers";
import CameraCapture from "../components/CameraCapture";
import EmployeeAttendanceHistory from "../components/EmployeeAttendanceHistory";

export default function EmployeeDashboard() {
  const { userProfile, systemSettings, logout } = useAuth();
  const navigate = useNavigate();

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  // GPS States
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  // Camera Overlay states
  const [activeCameraMode, setActiveCameraMode] = useState<"check_in" | "check_out" | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const { dateStr, timeStr } = formatCurrentTime();

  // Load today's attendance record and full history
  const loadAttendanceData = async () => {
    if (!userProfile) return;
    try {
      setLoading(true);
      const todayDate = formatCurrentTime().dateStr;
      
      const q = query(
        collection(db, "attendance"),
        where("uid", "==", userProfile.uid)
      );
      const snap = await getDocs(q);
      const records: AttendanceRecord[] = [];
      let todayRec: AttendanceRecord | null = null;

      snap.forEach(doc => {
        const data = doc.data() as AttendanceRecord;
        const rec = { attendanceId: doc.id, ...data };
        records.push(rec);
        if (data.date === todayDate) {
          todayRec = rec;
        }
      });

      // Sort history descending by date
      records.sort((a, b) => b.date.localeCompare(a.date));
      setHistory(records);
      setTodayRecord(todayRec);
    } catch (e) {
      console.error("Failed to load attendance logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userProfile) {
      navigate("/login");
      return;
    }
    loadAttendanceData();
  }, [userProfile]);

  // Request & Capture GPS Coordinates
  const requestGPS = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      setGpsLoading(true);
      setGpsError("");
      
      if (!navigator.geolocation) {
        const errMsg = "Geolocation is not supported by your browser.";
        setGpsError(errMsg);
        setGpsLoading(false);
        reject(new Error(errMsg));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy);
          setCoords({ lat, lng, accuracy });
          setGpsLoading(false);
          resolve({ lat, lng, accuracy });
        },
        (error) => {
          let errMsg = "Failed to capture GPS. Please try again.";
          if (error.code === error.PERMISSION_DENIED) {
            errMsg = "Location permission is required to mark attendance.";
          }
          setGpsError(errMsg);
          setGpsLoading(false);
          reject(new Error(errMsg));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  };

  const startAttendanceFlow = async (mode: "check_in" | "check_out") => {
    setActionError("");
    setCapturedPhoto(null);
    
    // Check Timing Windows
    const { timeStr: currentT } = formatCurrentTime();
    
    if (mode === "check_in") {
      const allowed = isTimeBetween(currentT, systemSettings.checkInStart, systemSettings.checkInEnd);
      if (!allowed) {
        setActionError(`Check-In window is closed. Attendance is permitted only between ${systemSettings.checkInStart} and ${systemSettings.checkInEnd}.`);
        return;
      }
    } else {
      // Check-out timing check
      const allowed = isTimeBetween(currentT, "12:00 AM", systemSettings.checkOutEnd);
      if (!allowed) {
        setActionError(`Check-Out window closed. Permitted only until ${systemSettings.checkOutEnd}.`);
        return;
      }
    }

    try {
      // 1. Capture GPS first as a hard constraint
      await requestGPS();
      // 2. Open Camera
      setActiveCameraMode(mode);
    } catch (e: any) {
      setActionError(e.message || "Failed to proceed. GPS verification is required.");
    }
  };

  const handleCaptureComplete = async (photoBase64: string) => {
    if (!userProfile || !coords) return;
    setSubmitting(true);
    setActionError("");

    const { dateStr: today, timeStr: currentT } = formatCurrentTime();
    const { browser, device } = getBrowserAndDevice();

    try {
      if (activeCameraMode === "check_in") {
        const attendanceId = "att_" + userProfile.uid + "_" + today;
        const newRecord: AttendanceRecord = {
          attendanceId,
          uid: userProfile.uid,
          userId: userProfile.userId,
          employeeName: userProfile.employeeName,
          officeName: userProfile.officeName || "N/A",
          date: today,
          checkInTime: currentT,
          checkInPhoto: photoBase64,
          checkInLatitude: coords.lat,
          checkInLongitude: coords.lng,
          gpsAccuracy: coords.accuracy,
          browser,
          device,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "attendance", attendanceId), newRecord);
      } else if (activeCameraMode === "check_out" && todayRecord) {
        // Update Check-Out in existing document
        await updateDoc(doc(db, "attendance", todayRecord.attendanceId), {
          checkOutTime: currentT,
          checkOutPhoto: photoBase64,
          checkOutLatitude: coords.lat,
          checkOutLongitude: coords.lng,
          gpsAccuracy: coords.accuracy
        });
      }

      // Close Camera Overlay and reload data
      setActiveCameraMode(null);
      await loadAttendanceData();
    } catch (err: any) {
      setActionError("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
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
        <p className="text-sm font-semibold text-slate-400">Verifying Identity Credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 pb-12 font-sans relative">
      
      {/* Top Header Section */}
      <header className="bg-[#111114] text-white border-b border-slate-800 shadow-md py-4 px-6 no-print">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1A1A1F] rounded-lg border border-slate-800">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-display font-bold tracking-tight text-sm sm:text-base">CENSUS OF INDIA 2027</h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Technical Assistant Portal</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold rounded-lg transition-all border border-red-900/50 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-red-400" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card & Action Box */}
        <div className="lg:col-span-1 space-y-6 no-print">
          
          {/* User Details Card */}
          <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 h-16 w-16 bg-[#1A1A1F] rounded-bl-3xl flex items-center justify-center border-l border-b border-slate-800">
              <User className="h-5 w-5 text-indigo-400" />
            </div>
            
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/30 border border-indigo-900/50 px-2 py-0.5 rounded uppercase tracking-wider">
              {userProfile?.designation || "Technical Assistant"}
            </span>

            <h2 className="font-display font-bold text-white text-lg mt-3 leading-tight">{userProfile?.employeeName}</h2>
            <p className="text-xs font-mono text-slate-500 mt-1">User ID: <span className="font-semibold text-slate-300">{userProfile?.userId}</span></p>

            <div className="mt-5 pt-4 border-t border-slate-800 space-y-3.5 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-500 shrink-0" />
                <div className="truncate">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Deputed Office</span>
                  <span className="text-slate-300">{userProfile?.officeName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-indigo-500/80 shrink-0" />
                <div>
                  <span className="text-indigo-400 block text-[9px] uppercase font-bold tracking-wider">Deputation Agency</span>
                  <span className="text-slate-200 font-semibold">ZAM Enterprise</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">District Area</span>
                  <span className="text-slate-300">{userProfile?.district}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Joining Date</span>
                  <span className="text-slate-300">{userProfile?.joiningDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timing Alerts / Status Controls */}
          <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="h-4.5 w-4.5 text-indigo-400" />
              <h3 className="font-display font-semibold text-white text-sm">Today's Attendance Panel</h3>
            </div>

            {/* Error Displays */}
            {actionError && (
              <div className="bg-red-950/20 border border-red-900/50 p-3 rounded-xl text-red-300 text-xs flex gap-2 items-start leading-relaxed animate-fade-in">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Timings Status Indicators */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#1A1A1F] p-2.5 rounded-xl border border-slate-800 text-slate-400">
              <div>
                <span className="block text-slate-500 uppercase font-mono text-[9px]">Check-In Shift</span>
                <span className="font-semibold text-slate-300 font-mono">{systemSettings.checkInStart} - {systemSettings.checkInEnd}</span>
              </div>
              <div>
                <span className="block text-slate-500 uppercase font-mono text-[9px]">Checkout Limit</span>
                <span className="font-semibold text-slate-300 font-mono">Until {systemSettings.checkOutEnd}</span>
              </div>
            </div>

            {/* Today's Status Details */}
            {todayRecord ? (
              <div className="space-y-3 pt-1 text-xs">
                {/* Checked In Info */}
                <div className="bg-emerald-950/20 border border-emerald-900/50 p-3 rounded-xl text-emerald-300 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <div>
                      <span className="font-semibold block">Checked In</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Time: {todayRecord.checkInTime}</span>
                    </div>
                  </div>
                  {todayRecord.checkInPhoto && (
                    <img 
                      src={todayRecord.checkInPhoto} 
                      alt="Check In" 
                      className="h-8 w-8 rounded-lg object-cover border border-emerald-900/40"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>

                {/* Checked Out Info */}
                {todayRecord.checkOutTime ? (
                  <div className="bg-blue-950/20 border border-blue-900/50 p-3 rounded-xl text-blue-300 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                      <div>
                        <span className="font-semibold block">Checked Out</span>
                        <span className="text-[10px] text-blue-400 font-mono">Time: {todayRecord.checkOutTime}</span>
                      </div>
                    </div>
                    {todayRecord.checkOutPhoto && (
                      <img 
                        src={todayRecord.checkOutPhoto} 
                        alt="Check Out" 
                        className="h-8 w-8 rounded-lg object-cover border border-blue-900/40"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                ) : (
                  /* Trigger Check-Out Button */
                  <button
                    onClick={() => startAttendanceFlow("check_out")}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
                  >
                    <MapPin className="h-4 w-4" />
                    Mark Check-Out
                  </button>
                )}
              </div>
            ) : (
              /* Trigger Check-In Button */
              <button
                onClick={() => startAttendanceFlow("check_in")}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
              >
                <Camera className="h-4 w-4" />
                Mark Check-In
              </button>
            )}

            {/* GPS Accuracy status loader */}
            {gpsLoading && (
              <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 pt-2 animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                <span>Synchronizing Atomic GPS Satellites...</span>
              </div>
            )}
            
            {coords && !gpsLoading && (
              <div className="bg-[#1A1A1F] border border-slate-800 p-2 rounded-lg text-[10px] font-mono text-slate-500 flex justify-between">
                <span>Lat: {coords.lat.toFixed(5)}</span>
                <span>Lng: {coords.lng.toFixed(5)}</span>
                <span className={coords.accuracy < 30 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                  Acc: {coords.accuracy}m
                </span>
              </div>
            )}
          </div>
        </div>

        {/* History Log Section & Interactive Camera Overlay */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Camera Interface (Overlay directly on workspace when taking attendance) */}
          {activeCameraMode && (
            <div className="no-print">
              <CameraCapture
                label={activeCameraMode === "check_in" ? "Verify Identity (Check-In)" : "Verify Identity (Check-Out)"}
                onCapture={handleCaptureComplete}
                onCancel={() => {
                  setActiveCameraMode(null);
                  setActionError("");
                }}
              />
            </div>
          )}

          {/* Attendance History Component */}
          {!activeCameraMode && (
            <EmployeeAttendanceHistory attendanceHistory={history} />
          )}

        </div>
      </main>

      {/* Footer copyright and credit info */}
      <footer className="mt-12 text-center text-slate-600 text-xs font-mono relative z-10 space-y-1 py-6 border-t border-slate-900 max-w-6xl mx-auto px-4 no-print">
        <p>© Census of India 2027 • Ministry of Home Affairs</p>
        <p className="text-[11px] text-slate-500">
          Developed by <span className="text-slate-400 font-semibold">S B Trading & Co</span> • Agency Partner: <span className="text-slate-400 font-semibold">ZAM Enterprise</span>
        </p>
        <p className="text-[10px] text-slate-600">
          All employees are deputed under Government project from ZAM Enterprise
        </p>
      </footer>
    </div>
  );
}
