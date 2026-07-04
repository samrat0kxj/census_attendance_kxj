import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { KeyRound, ShieldAlert, Lock, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";

export default function ChangePasswordPage() {
  const { changeMyPassword, userProfile } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Strength Check states
  const lengthValid = password.length >= 8;
  const upperValid = /[A-Z]/.test(password);
  const lowerValid = /[a-z]/.test(password);
  const digitValid = /[0-9]/.test(password);
  const specialValid = /[@#$!%*?&]/.test(password);
  const matchValid = password === confirmPassword && password.length > 0;

  const isPasswordSecure = lengthValid && upperValid && lowerValid && digitValid && specialValid;
  const isFormValid = isPasswordSecure && matchValid;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isFormValid) {
      setError("Please ensure all security validation parameters are fully met.");
      return;
    }

    setLoading(true);
    try {
      await changeMyPassword(password);
      setSuccess(true);
      setTimeout(() => {
        navigate("/employee");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update security password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-900/10 blur-3xl" />
      
      <div className="w-full max-w-md bg-[#111114] rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 z-10 relative">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-14 w-14 bg-[#1A1A1F] rounded-2xl flex items-center justify-center border border-slate-800 text-indigo-400 shadow-lg mb-3.5">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="font-display font-bold text-lg tracking-tight text-white uppercase">First Login: Password Mandatory Reset</h1>
          <p className="text-xs text-indigo-400 font-semibold uppercase mt-1 tracking-wider">Secure Enrollment Verification</p>
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-900/50 text-red-300 p-3.5 rounded-xl text-xs flex gap-2 mb-5">
            <ShieldAlert className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="bg-emerald-950/20 border border-emerald-900/50 text-emerald-300 p-6 rounded-xl text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="font-semibold text-sm">Security Password Configured!</p>
            <p className="text-xs text-emerald-400 leading-relaxed">Your temporary login credentials have been updated. Redirecting to employee dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4 text-sm text-slate-300">
            <p className="text-xs text-slate-400 leading-relaxed text-center mb-2">
              For security compliance, all newly enrolled Technical Assistants must update their password before being granted system access.
            </p>

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                New Secure Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full pl-3 pr-4 py-2 bg-[#0A0A0B]/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 font-mono text-sm"
              />
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                Confirm Secure Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full pl-3 pr-4 py-2 bg-[#0A0A0B]/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 font-mono text-sm"
              />
            </div>

            {/* Password Validation Parameters (Polished craft detail) */}
            <div className="bg-[#0A0A0B]/40 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-medium">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block mb-1">Password Requirements:</span>
              <div className="grid grid-cols-2 gap-2">
                <span className={`flex items-center gap-1.5 ${lengthValid ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${lengthValid ? "text-emerald-500" : "text-slate-700"}`} />
                  Min. 8 characters
                </span>
                <span className={`flex items-center gap-1.5 ${upperValid ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${upperValid ? "text-emerald-500" : "text-slate-700"}`} />
                  Uppercase (A-Z)
                </span>
                <span className={`flex items-center gap-1.5 ${lowerValid ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${lowerValid ? "text-emerald-500" : "text-slate-700"}`} />
                  Lowercase (a-z)
                </span>
                <span className={`flex items-center gap-1.5 ${digitValid ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${digitValid ? "text-emerald-500" : "text-slate-700"}`} />
                  Number (0-9)
                </span>
                <span className={`flex items-center gap-1.5 ${specialValid ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${specialValid ? "text-emerald-500" : "text-slate-700"}`} />
                  Special (@#$!)
                </span>
                <span className={`flex items-center gap-1.5 ${matchValid ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${matchValid ? "text-emerald-500" : "text-slate-700"}`} />
                  Passwords Match
                </span>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4.5 w-4.5" />
                  Establish Secure Password
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
