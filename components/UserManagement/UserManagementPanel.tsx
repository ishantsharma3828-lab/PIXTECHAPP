import React, { useState, useEffect } from 'react';
import UserFormPanel from './UserFormPanel';
import UserListPanel from './UserListPanel';
import UserProfilePanel from './UserProfilePanel';
import * as userManagementService from '../../services/userManagementService';
import { AppUser } from '../../constants/userTypes';

const UserManagementPanel: React.FC = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

    const loadUsers = async () => {
        const data = await userManagementService.getUsers();
        setUsers(data);
        if (selectedUser) {
            const updated = data.find(u => u.id === selectedUser.id);
            if (updated) setSelectedUser(updated);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleUpdateUser = async (updates: Partial<AppUser>) => {
        if (!selectedUser) return;
        const updatedUser = { ...selectedUser, ...updates };
        try {
            await userManagementService.saveUser(updatedUser);
            loadUsers();
            setSelectedUser(updatedUser);
        } catch (e) {
            console.error("Failed to update user", e);
            alert("Failed to update user. Permission denied?");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            await userManagementService.deleteUser(userId);
            loadUsers();
            if (selectedUser?.id === userId) setSelectedUser(null);
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    return (
        <div className="flex h-full -m-4 sm:-m-6 md:-m-8 overflow-hidden">
            {/* Left: Create */}
            <UserFormPanel onSave={loadUsers} />

            {/* Center: List */}
            <UserListPanel
                users={users}
                selectedId={selectedUser?.id || null}
                onSelect={setSelectedUser}
                onDelete={handleDeleteUser}
            />

            {/* Right: Profile */}
            <UserProfilePanel
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
                onUpdateUser={handleUpdateUser}
            />
        </div>
    );
};

export default UserManagementPanel;
