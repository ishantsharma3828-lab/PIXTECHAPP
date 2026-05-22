
import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import UserSettingsPanel from '../components/UserSettings/UserSettingsPanel';
import { SettingsContext } from '../contexts/SettingsContext';

const UserSettings: React.FC = () => {
  const { t } = useContext(SettingsContext);
  const location = useLocation();
  const initialTab = location.state?.activeTab || 'general';

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">My Profile</h1>
      <div className="flex-1 overflow-hidden">
        <UserSettingsPanel initialTab={initialTab} />
      </div>
    </div>
  );
};

export default UserSettings;
