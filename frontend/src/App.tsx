import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { NotificationPromptModal } from './components/NotificationPromptModal';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { RegisterProfilePage } from './pages/RegisterProfilePage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { StudentOrdersPage } from './pages/StudentOrdersPage';
import { StudentBillsPage } from './pages/StudentBillsPage';
import { StudentLedgerPage } from './pages/StudentLedgerPage';
import { StudentNotificationsPage } from './pages/StudentNotificationsPage';
import { StudentProfilePage } from './pages/StudentProfilePage';

import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminMenuPage } from './pages/AdminMenuPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';
import { AdminKitchenPage } from './pages/AdminKitchenPage';
import { AdminBillingPage } from './pages/AdminBillingPage';
import { AdminStudentsPage } from './pages/AdminStudentsPage';
import { AdminServiceStatusPage } from './pages/AdminServiceStatusPage';
import { AdminReportsPage } from './pages/AdminReportsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage';
import { SuperAdminDashboardPage } from './pages/SuperAdminDashboardPage';

// Protected Route wrappers
const ProtectedStudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-xs font-bold text-slate-400">Loading Hadkar Meals...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-xs font-bold text-slate-400">Loading Hadkar Meals...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/student/dashboard" replace />;
  return <>{children}</>;
};

const ProtectedSuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-xs font-bold text-slate-400">Loading Hadkar Meals...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isStudent } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 w-full max-w-full overflow-x-hidden antialiased">
      {user && <Navbar />}
      <main className={`flex-1 w-full max-w-full overflow-x-hidden ${user && isStudent ? 'pb-24 md:pb-8' : 'pb-8'}`}>
        {children}
      </main>
      {user && isStudent && <BottomNav />}
      {user && isStudent && <NotificationPromptModal />}
    </div>
  );
};

const RootRedirect: React.FC = () => {
  const { user, isSuperAdmin, isAdmin, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-xs font-bold text-slate-400">Loading Hadkar Meals...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            {/* Root */}
            <Route path="/" element={<RootRedirect />} />

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/register-profile" element={<RegisterProfilePage />} />

            {/* Super Admin Console */}
            <Route path="/super-admin" element={<ProtectedSuperAdminRoute><SuperAdminDashboardPage /></ProtectedSuperAdminRoute>} />

            {/* Student Pages */}
            <Route path="/student/dashboard" element={<ProtectedStudentRoute><StudentDashboardPage /></ProtectedStudentRoute>} />
            <Route path="/student/menu" element={<ProtectedStudentRoute><StudentDashboardPage /></ProtectedStudentRoute>} />
            <Route path="/student/orders" element={<ProtectedStudentRoute><StudentOrdersPage /></ProtectedStudentRoute>} />
            <Route path="/student/bills" element={<ProtectedStudentRoute><StudentBillsPage /></ProtectedStudentRoute>} />
            <Route path="/student/ledger" element={<ProtectedStudentRoute><StudentLedgerPage /></ProtectedStudentRoute>} />
            <Route path="/student/notifications" element={<ProtectedStudentRoute><StudentNotificationsPage /></ProtectedStudentRoute>} />
            <Route path="/student/profile" element={<ProtectedStudentRoute><StudentProfilePage /></ProtectedStudentRoute>} />

            {/* Admin Pages */}
            <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboardPage /></ProtectedAdminRoute>} />
            <Route path="/admin/menu" element={<ProtectedAdminRoute><AdminMenuPage /></ProtectedAdminRoute>} />
            <Route path="/admin/orders" element={<ProtectedAdminRoute><AdminOrdersPage /></ProtectedAdminRoute>} />
            <Route path="/admin/kitchen" element={<ProtectedAdminRoute><AdminKitchenPage /></ProtectedAdminRoute>} />
            <Route path="/admin/billing" element={<ProtectedAdminRoute><AdminBillingPage /></ProtectedAdminRoute>} />
            <Route path="/admin/students" element={<ProtectedAdminRoute><AdminStudentsPage /></ProtectedAdminRoute>} />
            <Route path="/admin/service-status" element={<ProtectedAdminRoute><AdminServiceStatusPage /></ProtectedAdminRoute>} />
            <Route path="/admin/reports" element={<ProtectedAdminRoute><AdminReportsPage /></ProtectedAdminRoute>} />
            <Route path="/admin/settings" element={<ProtectedAdminRoute><AdminSettingsPage /></ProtectedAdminRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedAdminRoute><AdminAuditLogsPage /></ProtectedAdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
};

export default App;

