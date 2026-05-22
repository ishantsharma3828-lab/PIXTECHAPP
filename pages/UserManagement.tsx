
import React from 'react';
import UserManagementPanel from '../components/UserManagement/UserManagementPanel';

const UserManagement: React.FC = () => {
  return (
    <div className="h-[calc(100vh-6rem)]">
      <UserManagementPanel />
    </div>
  );
};

export default UserManagement;
