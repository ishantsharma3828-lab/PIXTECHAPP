
import React, { createContext, useState } from 'react';

interface UIContextType {
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (isOpen: boolean) => void;
  isSidebarVisible: boolean;
  toggleSidebarVisibility: () => void;
}

export const UIContext = createContext<UIContextType>({
  isSidebarCollapsed: false,
  toggleSidebarCollapse: () => {},
  isMobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  isSidebarVisible: true,
  toggleSidebarVisibility: () => {},
});

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarVisible, setSidebarVisible] = useState(true);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const toggleSidebarVisibility = () => {
    setSidebarVisible(prev => !prev);
  };

  const value = {
    isSidebarCollapsed,
    toggleSidebarCollapse,
    isMobileMenuOpen,
    setMobileMenuOpen,
    isSidebarVisible,
    toggleSidebarVisibility,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
