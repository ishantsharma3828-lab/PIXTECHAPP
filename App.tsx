
import React, { useState, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Auth
import * as authService from './services/authService';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ForgotPassword from './pages/Auth/ForgotPassword';

// Import all page components
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import SalesLog from './pages/SalesLog';
import PCConfigurator from './pages/PCConfigurator';
import ServiceDesk from './pages/ServiceDesk';
import IncomingStock from './pages/IncomingStock';
import Expenses from './pages/Expenses';
import Contacts from './pages/Contacts';
import RMA from './pages/RMA';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import UserSettings from './pages/UserSettings';
import BusinessRules from './pages/BusinessRules';
import DebtManager from './pages/DebtManager';
import ZROrdersPage from './pages/ZROrdersPage';
import { UIContext } from './contexts/UIContext';
import { SettingsContext } from './contexts/SettingsContext';

import TitleBar from './components/Layout/TitleBar';
import { TabGuard } from './components/Auth/TabGuard';
import { usePermissions } from './hooks/usePermissions';

import { startSync, startAutoSync, healLocalData } from './services/syncService';

// New StoreFront Imports
import StoreLayout from './components/StoreFront/StoreLayout';
import StoreFront from './pages/StoreFront/StoreFront';
import Products from './pages/StoreFront/Products';
import ProductDetails from './pages/StoreFront/ProductDetails';
import PCBuilder from './pages/StoreFront/PCBuilder';
import Support from './pages/StoreFront/Support';
import RepairService from './pages/StoreFront/RepairService';
import Cart from './pages/StoreFront/Cart';
import StoreProfile from './pages/StoreFront/StoreProfile';
import Favorites from './pages/StoreFront/Favorites';
import { CartProvider } from './contexts/CartContext';
import { ToastProvider } from './contexts/ToastContext';

const POSLayout: React.FC<{ user: authService.User; onLogout: () => void }> = ({ user, onLogout }) => {
  useEffect(() => {
    let cleanupSync: (() => void) | undefined;

    // Initialize background sync with the Titan Stack backend
    const initSync = async () => {
      try {
        console.log('[App] Initializing Titan Stack auto-sync loop...');
        // healLocalData is a no-op in Titan Stack (kept for API compatibility)
        await healLocalData(null, user.organizationId);
        // startAutoSync starts the 15-second polling loop and online listener
        cleanupSync = startAutoSync();
      } catch (e) {
        console.error('[App] Sync init failed:', e);
      }
    };
    initSync();

    // Deep Link Handler (Electron renderer) — JWT-based, no Supabase
    if ((window as any).electronAPI) {
      (window as any).electronAPI.onDeepLink((url: string) => {
        console.log('[App] Received deep link:', url);
        // TODO: Parse JWT token from deep link and store via tokenManager
        // import { tokenManager } from './services/apiBridge';
        // tokenManager.set(parsedToken);
      });
    }

    return () => {
      if (cleanupSync) {
        cleanupSync();
      }
    };
  }, []); // Run once on mount

  const { isManager } = usePermissions();

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-200 font-sans antialiased selection:bg-blue-500/30">
      <div className="relative z-10 flex flex-col h-full">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onLogout={onLogout} />
            <main className="flex-1 overflow-x-hidden overflow-y-auto w-full max-w-[100vw] p-4 pb-24 sm:p-6 sm:pb-6 md:p-8 md:pb-8 bg-transparent relative">
              <Routes>
                <Route path="/" element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard"        element={<TabGuard tab="dashboard"><Dashboard /></TabGuard>} />
                <Route path="inventory"        element={<TabGuard tab="inventory"><Inventory /></TabGuard>} />
                <Route path="billing"          element={<TabGuard tab="billing"><Billing /></TabGuard>} />
                <Route path="sales-log"        element={<TabGuard tab="sales-log"><SalesLog /></TabGuard>} />
                <Route path="pc-configurator" element={<TabGuard tab="pc-configurator"><PCConfigurator /></TabGuard>} />
                <Route path="service-desk"     element={<TabGuard tab="service-desk"><ServiceDesk /></TabGuard>} />
                <Route path="expenses"         element={<TabGuard tab="expenses"><Expenses /></TabGuard>} />
                <Route path="contacts"         element={<TabGuard tab="contacts"><Contacts /></TabGuard>} />
                <Route path="user-profile"     element={<UserSettings />} />
                <Route path="delivery-manager" element={<TabGuard tab="delivery-manager"><ZROrdersPage /></TabGuard>} />
                <Route path="debt-manager"     element={<TabGuard tab="debt-manager"><DebtManager /></TabGuard>} />
                <Route path="rma"              element={<TabGuard tab="rma"><RMA /></TabGuard>} />
                <Route path="user-management"  element={<TabGuard tab="user-management"><UserManagement /></TabGuard>} />
                <Route path="business-rules"   element={<TabGuard tab="business-rules"><BusinessRules /></TabGuard>} />
                <Route path="settings"         element={<TabGuard tab="settings"><Settings /></TabGuard>} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
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

  return (
    <ToastProvider>
      <CartProvider>
        <HashRouter>
          <Routes>
          {/* Public / Customer Storefront Routes */}
          <Route path="/" element={<StoreLayout user={user} onLogout={() => setUser(null)} />}>
            <Route index element={<StoreFront />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetails />} />
            <Route path="pc-builder" element={<PCBuilder />} />
            <Route path="support" element={<Support />} />
            <Route path="repair" element={<RepairService />} />
            <Route path="cart" element={<Cart />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="profile" element={<StoreProfile user={user} onLogout={() => setUser(null)} />} />
          </Route>

          {/* Auth Routes */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* POS / Staff Routes */}
          <Route 
            path="/pos/*" 
            element={
              user && user.role !== 'customer' ? (
                <POSLayout user={user} onLogout={() => setUser(null)} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </CartProvider>
    </ToastProvider>
  );
};

export default App;
