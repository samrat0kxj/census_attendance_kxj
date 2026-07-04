export type UserRole = "super_admin" | "admin" | "employee";
export type UserStatus = "Active" | "Inactive";

export interface UserProfile {
  uid: string;
  userId: string; // login username, e.g., "SMA2407A", "superadmin", "admin01"
  employeeName: string;
  fatherName?: string;
  dob?: string; // YYYY-MM-DD
  mobile?: string;
  email?: string;
  gender?: string;
  designation?: string;
  officeName?: string; // Government office deputed to
  district?: string;
  joiningDate?: string; // YYYY-MM-DD
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  passwordChanged?: boolean; // Must be true for employees to access full dashboard after first login
}

export interface AttendanceRecord {
  attendanceId: string;
  uid: string;
  userId: string;
  employeeName: string;
  officeName: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // e.g. "09:30 AM"
  checkOutTime?: string; // e.g. "06:15 PM"
  checkInPhoto: string; // base64 representation of image
  checkOutPhoto?: string; // base64 representation of image
  checkInLatitude: number;
  checkInLongitude: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  gpsAccuracy: number; // GPS accuracy in meters
  browser: string;
  device: string;
  createdAt: string; // ISO string
}

export interface SystemSettings {
  checkInStart: string; // e.g., "09:00 AM"
  checkInEnd: string; // e.g., "11:30 AM"
  checkOutEnd: string; // e.g., "07:00 PM"
}

export interface AuditLog {
  logId: string;
  adminUid: string;
  adminName: string;
  action: string; // e.g. "Create Employee", "Reset Password", "Delete Employee", "Update Settings"
  details: string;
  timestamp: string;
}
