import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { KeyRound, User, Lock, RefreshCw, AlertCircle, Building2, Landmark, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login, currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load remembered credentials
  useEffect(() => {
    const rememberedId = localStorage.getItem("census_remembered_id");
    if (rememberedId) {
      setUserId(rememberedId);
      setRememberMe(true);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser && userProfile) {
      if (userProfile.passwordChanged === false && userProfile.role === "employee") {
        navigate("/change-password");
      } else if (userProfile.role === "super_admin" || userProfile.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/employee");
      }
    }
  }, [currentUser, userProfile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) {
      setError("Please fill in both User ID and Password.");
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      const profile = await login(userId, password);
      
      // Save username if remember me is checked
      if (rememberMe) {
        localStorage.setItem("census_remembered_id", userId);
      } else {
        localStorage.removeItem("census_remembered_id");
      }

      // Routing depending on profile role and password status
      if (profile.role === "employee") {
        if (profile.passwordChanged === false) {
          navigate("/change-password");
        } else {
          navigate("/employee");
        }
      } else {
        navigate("/admin");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-900/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-900/10 blur-3xl" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-[#111114] rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 z-10 relative">
        
        {/* National Emblem Header / Logo Placeholder */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-14 w-14 bg-[#1A1A1F] rounded-2xl flex items-center justify-center border border-slate-800 text-slate-100 shadow-lg mb-3.5">
            <Landmark className="h-7 w-7 text-indigo-400" />
          </div>
          <h1 className="font-display font-bold text-xl tracking-tight text-white uppercase">Census of India 2027</h1>
          <p className="text-xs text-indigo-400 font-semibold tracking-wider uppercase mt-1">Technical Assistant Attendance Engine</p>
          <div className="mt-2 text-[11px] text-slate-400 border border-slate-800 bg-slate-900/30 px-3 py-1 rounded-lg">
            Personnel deputed from <span className="text-indigo-400 font-semibold">ZAM Enterprise</span>
          </div>
        </div>

        {error && (
          <div className="space-y-3 mb-5">
            <div className="bg-red-950/20 border border-red-900/50 text-red-300 p-3.5 rounded-xl text-xs flex gap-2.5 items-start">
              <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>

            {error.includes("operation-not-allowed") && (
              <div className="bg-amber-950/25 border border-amber-500/30 text-amber-200 p-4 rounded-xl text-xs space-y-2.5 shadow-lg">
                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Firebase Setup Required
                </div>
                <p className="leading-relaxed text-amber-300/90">
                  The <strong>Email/Password</strong> sign-in method is currently disabled in your Firebase project. Please enable it to allow user login:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                  <li>Go to the <a href="https://console.firebase.google.com/project/gen-lang-client-0843491110/authentication/providers" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline font-semibold">Firebase Console Sign-In Tab</a>.</li>
                  <li>Click <strong>Add new provider</strong> and select <strong>Email/Password</strong>.</li>
                  <li>Toggle the first switch to <strong>Enable</strong> and click <strong>Save</strong>.</li>
                  <li>After enabling, refresh this page and log in!</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm text-slate-300">
          
          {/* User ID Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-500" />
              Census User ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. SMA2407A or admin01"
                required
                disabled={loading}
                className="w-full pl-3 pr-4 py-2.5 bg-[#0A0A0B]/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full pl-3 pr-4 py-2.5 bg-[#0A0A0B]/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="rounded border-slate-800 bg-[#0A0A0B] text-indigo-500 focus:ring-0 focus:ring-offset-0 focus:outline-hidden"
              />
              Remember Me
            </label>
            <span className="text-[11px] text-slate-500 font-medium">Reset via Admin Contact</span>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <KeyRound className="h-4.5 w-4.5" />
                Secure Portal Login
              </>
            )}
          </button>
        </form>



      </div>

      {/* Footer copyright */}
      <div className="mt-6 text-center text-slate-600 text-xs font-mono relative z-10 space-y-1">
        <p>© Census of India 2027 • Ministry of Home Affairs</p>
        <p className="text-[11px] text-slate-500">
          Developed by <span className="text-slate-400 font-semibold">S B Trading & Co</span> • Agency: <span className="text-slate-400 font-semibold">ZAM Enterprise</span>
        </p>
        <p className="text-[10px] text-slate-600">
          Technical Assistant employees are deputed under Government project from ZAM Enterprise
        </p>
      </div>
    </div>
  );
}
