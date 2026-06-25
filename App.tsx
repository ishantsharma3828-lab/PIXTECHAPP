
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Auth
import * as authService from './services/authService';
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';

// Import all POS page components
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import SalesLog from './pages/SalesLog';
import PCConfigurator from './pages/PCConfigurator';
import ServiceDesk from './pages/ServiceDesk';
import Expenses from './pages/Expenses';
import Contacts from './pages/Contacts';
import RMA from './pages/RMA';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import UserSettings from './pages/UserSettings';
import BusinessRules from './pages/BusinessRules';
import DebtManager from './pages/DebtManager';
import ZROrdersPage from './pages/ZROrdersPage';

// Employee Tracker & Admin Monitor
import EmployeeTracker from './pages/EmployeeTracker';
import AdminTracker from './pages/AdminTracker';
import TrackerIntro from './components/TrackerIntro';
import CalendarEventPopup from './components/CalendarEventPopup';

import { UIContext } from './contexts/UIContext';
import TitleBar from './components/Layout/TitleBar';
import { TabGuard } from './components/Auth/TabGuard';
import { ToastProvider } from './contexts/ToastContext';

import { startAutoSync, healLocalData } from './services/syncService';

const POSLayout: React.FC<{ user: authService.User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    let cleanupSync: (() => void) | undefined;

    const initSync = async () => {
      try {
        console.log('[App] Initializing Titan Stack auto-sync loop...');
        await healLocalData(null, user.organizationId);
        cleanupSync = startAutoSync();
      } catch (e) {
        console.error('[App] Sync init failed:', e);
      }
    };
    initSync();

    // Show tracker intro once after first login
    if (localStorage.getItem('tracker_intro_shown') !== 'true') {
      setTimeout(() => setShowIntro(true), 800);
    }

    if ((window as any).electronAPI) {
      (window as any).electronAPI.onDeepLink((url: string) => {
        console.log('[App] Received deep link:', url);
      });
    }

    return () => {
      if (cleanupSync) cleanupSync();
    };
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-200 font-sans antialiased selection:bg-blue-500/30">
      {/* Tracker intro overlay — shown once after first login */}
      {showIntro && <TrackerIntro onDismiss={() => setShowIntro(false)} />}

      {/* Calendar event popups for employees */}
      <CalendarEventPopup />

      <div className="relative z-10 flex flex-col h-full">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onLogout={onLogout} />
            <main className="flex-1 overflow-x-hidden overflow-y-auto w-full max-w-[100vw] p-4 pb-24 sm:p-6 sm:pb-6 md:p-8 md:pb-8 bg-transparent relative">
              <Routes>
                <Route path="/" element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard"          element={<TabGuard tab="dashboard"><Dashboard /></TabGuard>} />
                <Route path="inventory"          element={<TabGuard tab="inventory"><Inventory /></TabGuard>} />
                <Route path="billing"            element={<TabGuard tab="billing"><Billing /></TabGuard>} />
                <Route path="sales-log"          element={<TabGuard tab="sales-log"><SalesLog /></TabGuard>} />
                <Route path="pc-configurator"    element={<TabGuard tab="pc-configurator"><PCConfigurator /></TabGuard>} />
                <Route path="service-desk"       element={<TabGuard tab="service-desk"><ServiceDesk /></TabGuard>} />
                <Route path="expenses"           element={<TabGuard tab="expenses"><Expenses /></TabGuard>} />
                <Route path="contacts"           element={<TabGuard tab="contacts"><Contacts /></TabGuard>} />
                <Route path="user-profile"       element={<UserSettings />} />
                <Route path="delivery-manager"   element={<TabGuard tab="delivery-manager"><ZROrdersPage /></TabGuard>} />
                <Route path="debt-manager"       element={<TabGuard tab="debt-manager"><DebtManager /></TabGuard>} />
                <Route path="rma"                element={<TabGuard tab="rma"><RMA /></TabGuard>} />
                <Route path="user-management"    element={<TabGuard tab="user-management"><UserManagement /></TabGuard>} />
                <Route path="business-rules"     element={<TabGuard tab="business-rules"><BusinessRules /></TabGuard>} />
                <Route path="settings"           element={<TabGuard tab="settings"><Settings /></TabGuard>} />
                {/* ── Tracker tabs ───────────────────────────────────────── */}
                <Route path="employee-tracker"   element={<EmployeeTracker />} />
                <Route path="admin-monitor"      element={<TabGuard tab="admin-monitor"><AdminTracker /></TabGuard>} />
                <Route path="*"                  element={<Navigate to="dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<authService.User | null>(authService.getCurrentUser());

  const handleLogin = (loggedInUser: authService.User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          {/* ── Auth ──────────────────────────────────────────────────── */}
          <Route
            path="/login"
            element={
              user && user.role !== 'customer'
                ? <Navigate to="/pos/dashboard" replace />
                : <Login onLogin={handleLogin} />
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* ── POS / Staff ───────────────────────────────────────────── */}
          <Route
            path="/pos/*"
            element={
              user && user.role !== 'customer'
                ? <POSLayout user={user} onLogout={handleLogout} />
                : <Navigate to="/login" replace />
            }
          />

          {/* ── Default: redirect to login or POS ─────────────────────── */}
          <Route
            path="*"
            element={
              user && user.role !== 'customer'
                ? <Navigate to="/pos/dashboard" replace />
                : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
};

export default App;
