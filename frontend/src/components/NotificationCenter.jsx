import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import {
    Bell, X, Check, CheckCheck, Trash2, Volume2, VolumeX,
    AlertTriangle, FileText, Ticket, Clock, Calendar, ChevronRight,
    BellOff, Sparkles, ExternalLink, Filter, AlarmClock,
    ChevronDown, ChevronUp, Users, AlertCircle, Info
} from 'lucide-react';

// Priority styling
const priorityConfig = {
    urgent: { color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20', dot: 'bg-red-500', glow: 'shadow-red-500/20' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/20', dot: 'bg-orange-500', glow: 'shadow-orange-500/20' },
    medium: { color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/20', dot: 'bg-blue-500', glow: 'shadow-blue-500/20' },
    low: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/20', dot: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
};

// Type icons
const typeIcons = {
    subscription_expiring: Users,
    invoice_due: FileText,
    ticket_stale: Ticket,
    demo_expiring: Clock,
    custom: Bell,
};

// Filter tab config
const FILTER_TABS = [
    { key: 'all', label: 'All', icon: Filter },
    { key: 'urgent', label: 'Urgent', icon: AlertCircle },
    { key: 'subscription_expiring', label: 'Subs', icon: Users },
    { key: 'invoice_due', label: 'Invoices', icon: FileText },
    { key: 'ticket_stale', label: 'Tickets', icon: Ticket },
];

// Snooze options
const SNOOZE_OPTIONS = [
    { label: '1 hour', hours: 1 },
    { label: '24 hours', hours: 24 },
    { label: '1 week', hours: 168 },
];

// Relative time helper
function getRelativeTime(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = date - now;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffDays > 0) return `Due in ${diffDays}d`;
    if (diffDays === 0 && diffHours > 0) return `Due in ${diffHours}h`;
    if (diffDays === 0 && diffHours === 0) return 'Due now';
    if (diffDays >= -1) return `${Math.abs(diffHours)}h overdue`;
    return `${Math.abs(diffDays)}d overdue`;
}

function getRelativeTimeColor(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffDays = Math.round((date - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'text-red-400';
    if (diffDays <= 3) return 'text-amber-400';
    return 'text-emerald-400';
}

// ─── Notification Detail Modal ───────────────────────
function NotificationDetailModal({ notification, onClose, onMarkRead, onDismiss }) {
    const pConfig = priorityConfig[notification.priority] || priorityConfig.medium;
    const TypeIcon = typeIcons[notification.reminder_type] || Bell;

    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-lg bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-6 py-5 bg-gradient-to-r ${notification.priority === 'urgent' ? 'from-red-600/80 to-rose-700/80' : notification.priority === 'high' ? 'from-orange-500/80 to-amber-600/80' : 'from-indigo-600/80 to-purple-600/80'} backdrop-blur-md`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl">
                                <TypeIcon size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{notification.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pConfig.bg} ${pConfig.color} border ${pConfig.border}`}>
                                        {notification.priority_display}
                                    </span>
                                    <span className="text-xs text-white/60">{notification.type_display}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl text-white/70 hover:text-white transition-all">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-gray-300 text-sm leading-relaxed">{notification.message}</p>

                    <div className="grid grid-cols-2 gap-3">
                        {notification.due_date && (
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <span className="text-xs text-gray-500 block mb-1">Due Date</span>
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-gray-400" />
                                    <span className="text-sm text-gray-300">{new Date(notification.due_date).toLocaleDateString()}</span>
                                </div>
                                <span className={`text-xs mt-1 block ${getRelativeTimeColor(notification.due_date)}`}>
                                    {getRelativeTime(notification.due_date)}
                                </span>
                            </div>
                        )}
                        {notification.client_name && (
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <span className="text-xs text-gray-500 block mb-1">Client</span>
                                <span className="text-sm text-gray-300">{notification.client_name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer actions */}
                <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex items-center justify-between">
                    <button
                        onClick={() => { onDismiss(notification.id); onClose(); }}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
                    >
                        <Trash2 size={14} /> Dismiss
                    </button>
                    {!notification.is_read && (
                        <button
                            onClick={() => { onMarkRead(notification.id); onClose(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition-colors"
                        >
                            <Check size={14} /> Mark as Read
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── Single Notification Item ────────────────────────
function NotificationItem({ notification, onMarkRead, onDismiss, onSnooze, onClick }) {
    const [showSnooze, setShowSnooze] = useState(false);
    const pConfig = priorityConfig[notification.priority] || priorityConfig.medium;
    const TypeIcon = typeIcons[notification.reminder_type] || Bell;

    return (
        <div
            className={`
                mx-2 my-1 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group
                border border-transparent
                ${notification.is_read
                    ? 'bg-white/[0.02] hover:bg-white/[0.05]'
                    : 'bg-white/[0.05] hover:bg-white/[0.08] border-l-2 ' + pConfig.border
                }
            `}
            onClick={() => onClick(notification)}
        >
            <div className="flex items-start gap-3">
                {/* Icon badge */}
                <div className={`flex-shrink-0 p-2 rounded-xl mt-0.5 ${pConfig.bg} border ${pConfig.border}`}>
                    <TypeIcon size={14} className={pConfig.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${notification.is_read ? 'text-gray-400' : 'text-gray-200'}`}>
                            {notification.title}
                        </p>
                        {!notification.is_read && (
                            <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${pConfig.dot}`} />
                        )}
                    </div>

                    <p className="text-xs text-gray-500 truncate mt-0.5">{notification.message}</p>

                    {/* Due date countdown */}
                    <div className="flex items-center gap-3 mt-1.5">
                        {notification.due_date && (
                            <span className={`text-[10px] font-medium flex items-center gap-1 ${getRelativeTimeColor(notification.due_date)}`}>
                                <Clock size={10} />
                                {getRelativeTime(notification.due_date)}
                            </span>
                        )}
                        {notification.client_name && (
                            <span className="text-[10px] text-gray-500">{notification.client_name}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick actions row */}
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
                {!notification.is_read && (
                    <button
                        onClick={() => onMarkRead(notification.id)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-400 hover:bg-blue-500/15 rounded-lg transition-colors"
                    >
                        <Check size={10} /> Read
                    </button>
                )}
                <button
                    onClick={() => setShowSnooze(!showSnooze)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-amber-400 hover:bg-amber-500/15 rounded-lg transition-colors"
                >
                    <AlarmClock size={10} /> Snooze
                </button>
                <button
                    onClick={() => onDismiss(notification.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/15 rounded-lg transition-colors"
                >
                    <X size={10} /> Dismiss
                </button>
            </div>

            {/* Snooze dropdown */}
            {showSnooze && (
                <div className="flex items-center gap-1 mt-1.5 pl-9" onClick={e => e.stopPropagation()}>
                    {SNOOZE_OPTIONS.map(opt => (
                        <button
                            key={opt.hours}
                            onClick={() => { onSnooze(notification.id, opt.hours); setShowSnooze(false); }}
                            className="px-2.5 py-1 text-[10px] font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 transition-colors"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main NotificationCenter ─────────────────────────
export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedNotification, setSelectedNotification] = useState(null);
    const dropdownRef = useRef(null);

    const {
        notifications,
        unreadCount,
        isLoading,
        soundEnabled,
        hasNewNotification,
        markAsRead,
        dismissNotification,
        snoozeNotification,
        markAllAsRead,
        dismissAll,
        setSoundEnabled,
        fetchNotifications,
    } = useNotifications();

    const { isDark } = useTheme();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification) => {
        setSelectedNotification(notification);
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
    };

    // Filter logic
    const filteredNotifications = notifications.filter(n => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'urgent') return n.priority === 'urgent' || n.priority === 'high';
        return n.reminder_type === activeFilter;
    });

    // Count per filter
    const filterCounts = {
        all: notifications.length,
        urgent: notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length,
        subscription_expiring: notifications.filter(n => n.reminder_type === 'subscription_expiring').length,
        invoice_due: notifications.filter(n => n.reminder_type === 'invoice_due').length,
        ticket_stale: notifications.filter(n => n.reminder_type === 'ticket_stale').length,
    };

    return (
        <>
            <div className="relative" ref={dropdownRef}>
                {/* Bell Button */}
                <button
                    onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
                    className={`relative p-2.5 rounded-xl transition-all duration-300 group ${isDark
                        ? 'bg-white/10 hover:bg-white/20'
                        : 'bg-gray-100 hover:bg-gray-200 shadow-sm hover:shadow-md'
                        }`}
                >
                    <Bell
                        size={20}
                        className={`
                            transition-transform
                            ${isDark ? 'text-gray-200' : 'text-gray-600'}
                            ${hasNewNotification ? 'bell-shake' : 'group-hover:scale-110'}
                        `}
                    />

                    {/* Unread badge */}
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg shadow-red-500/30 animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}

                    {/* Ping animation */}
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-400 rounded-full animate-ping opacity-75" />
                    )}
                </button>

                {/* Dropdown Panel */}
                {isOpen && (
                    <div className="absolute right-0 mt-3 w-[440px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl shadow-black/50 border border-white/10 overflow-hidden z-50 toast-slide-in backdrop-blur-xl">
                        {/* Header */}
                        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-pink-600/90 backdrop-blur-md">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <Sparkles size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <span className="text-xs text-white/80">{unreadCount} unread</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setSoundEnabled(!soundEnabled)}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 text-white/80 hover:text-white"
                                        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                                    >
                                        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 text-white/80 hover:text-white"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="px-3 py-2 bg-black/30 border-b border-white/5 flex items-center gap-1 overflow-x-auto scrollbar-none">
                            {FILTER_TABS.map(tab => {
                                const TabIcon = tab.icon;
                                const count = filterCounts[tab.key] || 0;
                                const isActive = activeFilter === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveFilter(tab.key)}
                                        className={`
                                            flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                                            transition-all duration-200 whitespace-nowrap flex-shrink-0
                                            ${isActive
                                                ? 'bg-white/15 text-white border border-white/10'
                                                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                                            }
                                        `}
                                    >
                                        <TabIcon size={12} />
                                        {tab.label}
                                        {count > 0 && (
                                            <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Actions bar */}
                        {notifications.length > 0 && (
                            <div className="px-5 py-2.5 bg-black/20 border-b border-white/5 flex items-center justify-between">
                                <button
                                    onClick={markAllAsRead}
                                    className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-blue-400 transition-colors"
                                >
                                    <CheckCheck size={14} />
                                    Mark all read
                                </button>
                                <button
                                    onClick={dismissAll}
                                    className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={14} />
                                    Clear all
                                </button>
                            </div>
                        )}

                        {/* Notifications list */}
                        <div className="overflow-y-auto max-h-[380px] py-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {isLoading ? (
                                <div className="p-10 text-center">
                                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-sm text-gray-400 mt-3">Loading notifications...</p>
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                        <BellOff size={28} className="text-gray-600" />
                                    </div>
                                    <p className="text-gray-300 font-medium">
                                        {activeFilter === 'all' ? 'All caught up!' : 'No matching notifications'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {activeFilter === 'all' ? 'No notifications to show' : 'Try another filter'}
                                    </p>
                                </div>
                            ) : (
                                filteredNotifications.map(notification => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onMarkRead={markAsRead}
                                        onDismiss={dismissNotification}
                                        onSnooze={snoozeNotification}
                                        onClick={handleNotificationClick}
                                    />
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-black/20 border-t border-white/5">
                            <Link
                                to="/settings"
                                className="flex items-center justify-center gap-2 text-xs font-medium text-gray-400 hover:text-indigo-400 transition-colors group"
                                onClick={() => setIsOpen(false)}
                            >
                                Manage notification settings
                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedNotification && (
                <NotificationDetailModal
                    notification={selectedNotification}
                    onClose={() => setSelectedNotification(null)}
                    onMarkRead={markAsRead}
                    onDismiss={dismissNotification}
                />
            )}
        </>
    );
}
