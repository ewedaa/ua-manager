import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { API_BASE_URL } from '../lib/api';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

// Notification sound options
const SOUND_TONES = {
    chime: { freq: 800, type: 'sine', duration: 0.3 },
    bell: { freq: 600, type: 'triangle', duration: 0.4 },
    alert: { freq: 1000, type: 'square', duration: 0.2 },
};

const playNotificationSound = (tone = 'chime') => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const config = SOUND_TONES[tone] || SOUND_TONES.chime;

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = config.freq;
        oscillator.type = config.type;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + config.duration);
    } catch (e) {
        console.log('Audio not supported');
    }
};

// Request browser notification permission
const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
};

// Show browser notification
const showBrowserNotification = (title, body, onClick) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'ua-manager-notification',
        });

        if (onClick) {
            notification.onclick = onClick;
        }
    }
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [toasts, setToasts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [soundTone, setSoundTone] = useState('chime');
    const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
    const [hasNewNotification, setHasNewNotification] = useState(false);
    const previousUnreadRef = useRef(0);

    // Fetch notifications from API
    const fetchNotifications = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/notifications/`);
            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unread || 0);
            setTotalCount(data.total || 0);

            // If new unread notifications arrived, show alert
            if (data.unread > previousUnreadRef.current && previousUnreadRef.current > 0) {
                const newNotification = data.notifications.find(n => !n.is_read);
                if (newNotification) {
                    addToast(newNotification.title, newNotification.priority);
                    if (soundEnabled) playNotificationSound(soundTone);
                    if (browserNotificationsEnabled) {
                        showBrowserNotification(newNotification.title, newNotification.message);
                    }
                    // Trigger bell shake
                    setHasNewNotification(true);
                    setTimeout(() => setHasNewNotification(false), 2000);
                }
            }
            previousUnreadRef.current = data.unread;

        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
        }
    }, [soundEnabled, soundTone, browserNotificationsEnabled]);

    // Mark notification as read
    const markAsRead = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/notifications/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_read: true })
            });
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    // Dismiss notification
    const dismissNotification = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/notifications/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_dismissed: true })
            });
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to dismiss:', error);
        }
    };

    // Snooze notification
    const snoozeNotification = async (id, durationHours) => {
        try {
            const snoozedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
            await fetch(`${API_BASE_URL}/notifications/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snoozed_until: snoozedUntil })
            });
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to snooze:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await fetch(`${API_BASE_URL}/notifications/mark-all-read/`, {
                method: 'POST'
            });
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    // Dismiss all
    const dismissAll = async () => {
        try {
            await fetch(`${API_BASE_URL}/notifications/dismiss-all/`, {
                method: 'POST'
            });
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to dismiss all:', error);
        }
    };

    // Create custom reminder
    const createReminder = async (reminderData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reminderData)
            });
            if (!response.ok) throw new Error('Failed to create reminder');
            await fetchNotifications();
            return true;
        } catch (error) {
            console.error('Failed to create reminder:', error);
            return false;
        }
    };

    // Toast management
    const addToast = (message, priority = 'medium') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, priority }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Enable browser notifications
    const enableBrowserNotifications = async () => {
        await requestNotificationPermission();
        if (Notification.permission === 'granted') {
            setBrowserNotificationsEnabled(true);
        }
    };

    // Grouped notifications by type
    const groupedNotifications = useMemo(() => {
        const groups = {};
        notifications.forEach(n => {
            const type = n.reminder_type || 'custom';
            if (!groups[type]) {
                groups[type] = { type, label: n.type_display || type, items: [] };
            }
            groups[type].items.push(n);
        });
        return Object.values(groups);
    }, [notifications]);

    // Initial fetch and smart polling
    useEffect(() => {
        fetchNotifications();
        requestNotificationPermission();

        let interval;
        let isVisible = true;

        // Visibility-based polling - pause when tab hidden
        const handleVisibilityChange = () => {
            isVisible = !document.hidden;

            if (interval) {
                clearInterval(interval);
            }

            if (isVisible) {
                fetchNotifications();
                interval = setInterval(fetchNotifications, 30000);
            } else {
                interval = setInterval(fetchNotifications, 120000);
            }
        };

        interval = setInterval(fetchNotifications, 30000);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchNotifications]);

    const value = {
        notifications,
        unreadCount,
        totalCount,
        toasts,
        isLoading,
        soundEnabled,
        soundTone,
        browserNotificationsEnabled,
        hasNewNotification,
        groupedNotifications,
        fetchNotifications,
        markAsRead,
        dismissNotification,
        snoozeNotification,
        markAllAsRead,
        dismissAll,
        createReminder,
        addToast,
        removeToast,
        setSoundEnabled,
        setSoundTone,
        enableBrowserNotifications,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
