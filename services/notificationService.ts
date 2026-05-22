
export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
    read: boolean;
    link?: string;
    audience?: 'all' | 'admin'; // 'admin' = only admins should see this
}

const NOTIFICATIONS_KEY = 'pos_app_notifications';

export const getNotifications = (): AppNotification[] => {
    try {
        const stored = localStorage.getItem(NOTIFICATIONS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const markAsRead = (id: string): AppNotification[] => {
    const notifications = getNotifications();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return updated;
};

export const markAllAsRead = (): AppNotification[] => {
    const notifications = getNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return updated;
};

export const addNotification = (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification[] => {
    const notifications = getNotifications();
    const newNotif: AppNotification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        read: false
    };
    const updated = [newNotif, ...notifications].slice(0, 100); // Keep last 100
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return updated;
};

export const clearAllNotifications = (): AppNotification[] => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([]));
    return [];
};

export const deleteNotification = (id: string): AppNotification[] => {
    const notifications = getNotifications();
    const updated = notifications.filter(n => n.id !== id);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return updated;
};
