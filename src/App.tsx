import React from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Import pages
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";

// Reusable loader
function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500 font-mono tracking-wider">Syncing System Securely...</span>
      </div>
    </div>
  );
}

// Protected Routing Guard
interface GuardProps {
  children: React.ReactNode;
  allowedRoles?: ("super_admin" | "admin" | "employee")[];
}

function ProtectedRoute({ children, allowedRoles }: GuardProps) {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!currentUser || !userProfile) {
    return <Navigate to="/login" replace />;
  }

  // If role is employee and they have NOT updated their temporary password, force change
  if (userProfile.role === "employee" && !userProfile.passwordChanged && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    // If unauthorized, redirect to standard home
    const redirectPath = userProfile.role === "employee" ? "/employee" : "/admin";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Enforced Password Change */}
          <Route 
            path="/change-password" 
            element={
              <ProtectedRoute allowedRoles={["employee"]}>
                <ChangePasswordPage />
              </ProtectedRoute>
            } 
          />

          {/* Employee Dashboard Portal */}
          <Route 
            path="/employee" 
            element={
              <ProtectedRoute allowedRoles={["employee"]}>
                <EmployeeDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Admin Control Center (Admins and Super Admins) */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Fallback routes */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
