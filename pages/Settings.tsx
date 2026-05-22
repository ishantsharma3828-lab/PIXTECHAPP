
import React, { useContext } from 'react';
import SettingsPanel from '../components/SettingsPanel';
import { SettingsContext } from '../contexts/SettingsContext';

const Settings: React.FC = () => {
  const { t } = useContext(SettingsContext);
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">{t('settings.title')}</h1>
      <SettingsPanel />
    </div>
  );
};

export default Settings;
