import React, { useState } from "react";
import { X, Copy, Check, Printer, UserPlus, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { UserProfile, UserStatus } from "../types";
import { generateUserId, generateTemporaryPassword } from "../utils/censusHelpers";

interface RegisterEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (employeeData: Omit<UserProfile, "uid" | "createdAt">, tempPass: string) => Promise<string>;
}

const GOVERNMENT_OFFICES = [
  "District Commissioner's Office",
  "Circle Office",
  "Block Office",
  "Municipal Office",
  "Census Cell",
  "Other Government Office"
];

const DISTRICTS = [
  "Central Delhi",
  "East Delhi",
  "New Delhi",
  "North Delhi",
  "North East Delhi",
  "North West Delhi",
  "Shahdara",
  "South Delhi",
  "South East Delhi",
  "South West Delhi",
  "West Delhi"
];

const DESIGNATIONS = [
  "Technical Assistant (TA)",
  "Census Supervisor",
  "Data Entry Operator",
  "Field Enumerator",
  "Office Assistant"
];

export default function RegisterEmployeeModal({ isOpen, onClose, onRegister }: RegisterEmployeeModalProps) {
  const [formData, setFormData] = useState({
    employeeName: "",
    fatherName: "",
    dob: "",
    mobile: "",
    email: "",
    gender: "Male",
    designation: "Technical Assistant (TA)",
    officeName: GOVERNMENT_OFFICES[0],
    customOfficeName: "",
    district: DISTRICTS[0],
    joiningDate: new Date().toISOString().split("T")[0],
    status: "Active" as UserStatus
  });

  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [successCreds, setSuccessCreds] = useState<{
    name: string;
    userId: string;
    tempPass: string;
    officeName: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setRegistering(true);

    try {
      // Validation
      if (!formData.employeeName || !formData.fatherName || !formData.dob || !formData.mobile) {
        throw new Error("Please fill in all mandatory fields.");
      }

      // Generate User ID and temporary password
      const userId = generateUserId(formData.employeeName, formData.dob);
      const tempPass = generateTemporaryPassword();
      const officeNameResolved = formData.officeName === "Other Government Office" 
        ? formData.customOfficeName || "Other Govt Office"
        : formData.officeName;

      const profileData: Omit<UserProfile, "uid" | "createdAt"> = {
        userId,
        employeeName: formData.employeeName,
        fatherName: formData.fatherName,
        dob: formData.dob,
        mobile: formData.mobile,
        email: formData.email || undefined,
        gender: formData.gender,
        designation: formData.designation,
        officeName: officeNameResolved,
        district: formData.district,
        joiningDate: formData.joiningDate,
        role: "employee",
        status: formData.status
      };

      await onRegister(profileData, tempPass);

      // Save to show success state credentials
      setSuccessCreds({
        name: formData.employeeName,
        userId,
        tempPass,
        officeName: officeNameResolved
      });

      // Clear form
      setFormData({
        employeeName: "",
        fatherName: "",
        dob: "",
        mobile: "",
        email: "",
        gender: "Male",
        designation: "Technical Assistant (TA)",
        officeName: GOVERNMENT_OFFICES[0],
        customOfficeName: "",
        district: DISTRICTS[0],
        joiningDate: new Date().toISOString().split("T")[0],
        status: "Active"
      });
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setRegistering(false);
    }
  };

  const handleCopy = () => {
    if (!successCreds) return;
    const text = `Census 2027 Technical Assistant Login Credentials:\n-----------------------------------------\nEmployee Name: ${successCreds.name}\nOffice Name: ${successCreds.officeName}\nDeputation Agency: ZAM Enterprise (Govt Deputed Staff)\nUser ID (Username): ${successCreds.userId}\nTemporary Password: ${successCreds.tempPass}\n-----------------------------------------\nSystem Developed by: S B Trading & Co\nNote: Changing the temporary password is mandatory after first login.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#111114] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-800 my-8">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#1A1A1F] border-b border-slate-800 no-print">
          <div className="flex items-center gap-2 text-indigo-400">
            <UserPlus className="h-5 w-5" />
            <h3 className="font-display font-semibold text-white text-base">Register Census TA Employee</h3>
          </div>
          <button 
            onClick={() => {
              setSuccessCreds(null);
              onClose();
            }}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Success / Confirmation State (Printable Credentials) */}
        {successCreds ? (
          <div className="p-6">
            <div className="bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 p-4 rounded-xl mb-6 text-sm flex gap-3 no-print">
              <Check className="h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="font-semibold">Employee Registered Successfully!</p>
                <p className="text-emerald-400 mt-0.5">A unique 8-character User ID and temporary password have been generated. Copy or print these credentials for the employee.</p>
              </div>
            </div>

            {/* Printable Credentials Receipt */}
            <div className="print-card border border-slate-800 rounded-xl p-6 bg-[#1A1A1F] shadow-inner text-slate-200">
              <div className="text-center pb-4 border-b border-dashed border-slate-800">
                <h4 className="font-display font-bold text-white text-lg">CENSUS OF INDIA 2027</h4>
                <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Technical Assistant (TA) Enrollment Receipt</p>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-6 py-6 text-sm">
                <div>
                  <span className="block text-xs font-mono uppercase text-slate-500">Employee Name</span>
                  <span className="font-semibold text-white">{successCreds.name}</span>
                </div>
                <div>
                  <span className="block text-xs font-mono uppercase text-slate-500">Deputed Office</span>
                  <span className="font-semibold text-white">{successCreds.officeName}</span>
                </div>
                <div className="col-span-2 border-t border-dashed border-slate-800 pt-3">
                  <span className="block text-xs font-mono uppercase text-slate-500">Deputation Agency</span>
                  <span className="font-semibold text-indigo-400">ZAM Enterprise</span>
                  <p className="text-[10px] text-slate-400">Deputed under Government Census project from ZAM Enterprise</p>
                </div>
                <div className="col-span-2 border-t border-dashed border-slate-800 pt-3">
                  <div className="bg-[#111114] p-3.5 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-mono uppercase text-slate-500">User ID (Username)</span>
                      <span className="font-mono font-bold text-indigo-400 text-base tracking-wider">{successCreds.userId}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded">Auto-Generated</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="bg-[#111114] p-3.5 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-mono uppercase text-slate-500">Temporary Password</span>
                      <span className="font-mono font-bold text-white text-base tracking-wider">{successCreds.tempPass}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded">Secure Temp</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-800 pt-4 text-center">
                <p className="text-[11px] text-slate-400 font-medium">Note: The employee must change this password upon logging in for the first time.</p>
                <p className="text-[10px] text-indigo-400/90 font-semibold mt-1.5 font-mono">System Developed by S B Trading & Co</p>
                <p className="text-[9px] text-slate-500 mt-1 font-mono">Timestamp: {new Date().toLocaleString()}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3 no-print">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1F] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-450" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Credentials"}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>
              <button
                onClick={() => setSuccessCreds(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                Register Another
              </button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 no-print text-slate-300">
            {error && (
              <div className="bg-red-955/20 border border-red-900/50 text-red-300 p-3.5 rounded-xl text-sm flex gap-2.5 items-start">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
              
              {/* Employee Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Employee Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="employeeName"
                  value={formData.employeeName}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Samrat Bhattacharjee"
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900/50 transition-all"
                />
              </div>

              {/* Father's Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Father's Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  required
                  placeholder="Father's full name"
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900/50 transition-all"
                />
              </div>

              {/* Date of Birth */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Date of Birth <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900/50 transition-all"
                />
              </div>

              {/* Mobile Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Mobile Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  required
                  placeholder="10-digit mobile number"
                  pattern="[0-9]{10}"
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900/50 transition-all"
                />
              </div>

              {/* Email Address (Optional) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Email Address <span className="text-slate-500">(Optional)</span></label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. employee@domain.com"
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900/50 transition-all"
                />
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Gender <span className="text-red-500">*</span></label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="Male" className="bg-[#111114]">Male</option>
                  <option value="Female" className="bg-[#111114]">Female</option>
                  <option value="Other" className="bg-[#111114]">Other</option>
                </select>
              </div>

              {/* Designation */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Designation <span className="text-red-500">*</span></label>
                <select
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  {DESIGNATIONS.map(d => (
                    <option key={d} value={d} className="bg-[#111114]">{d}</option>
                  ))}
                </select>
              </div>

              {/* Joining Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Joining Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                  required
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900/50 transition-all"
                />
              </div>

              {/* Deputed Office Name */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-400">Deputed Government Office <span className="text-red-500">*</span></label>
                <select
                  name="officeName"
                  value={formData.officeName}
                  onChange={handleChange}
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  {GOVERNMENT_OFFICES.map(o => (
                    <option key={o} value={o} className="bg-[#111114]">{o}</option>
                  ))}
                </select>
              </div>

              {/* Custom Office Name (Visible only when 'Other' is selected) */}
              {formData.officeName === "Other Government Office" && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Specify Custom Office Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="customOfficeName"
                    value={formData.customOfficeName}
                    onChange={handleChange}
                    required
                    placeholder="Enter full name of Government office"
                    className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-900/50 transition-all animate-fade-in"
                  />
                </div>
              )}

              {/* District */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">District <span className="text-red-500">*</span></label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  {DISTRICTS.map(d => (
                    <option key={d} value={d} className="bg-[#111114]">{d}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Employee Status <span className="text-red-500">*</span></label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="px-3 py-2 bg-[#1A1A1F] border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="Active" className="bg-[#111114]">Active</option>
                  <option value="Inactive" className="bg-[#111114]">Inactive</option>
                </select>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={registering}
                className="px-4 py-2 bg-[#1A1A1F] hover:bg-slate-800 disabled:opacity-50 text-slate-300 border border-slate-800 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={registering}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                {registering ? "Registering..." : "Generate & Register"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
