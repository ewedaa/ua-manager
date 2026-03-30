import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Home, Ticket, Users, Settings, Shield, Barcode, CreditCard, Monitor, FileText, Sun, Moon, RefreshCw, Download, Wifi, WifiOff, Mail, MessageCircle, Phone, ClipboardList, BookOpen, ChevronLeft, ChevronRight, Search as SearchIcon, Activity, PenTool, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { queryClient } from '../lib/queryClient';
import { API_BASE_URL } from '../lib/api';
import { fetchClients, fetchTickets, fetchInvoices, fetchSerials, fetchTodos } from '../lib/fetchers';



export default function Sidebar({ isOpen, onClose, isCollapsed, toggleCollapse }) {
    const { user, logout, isAdmin } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(null);

    useEffect(() => {
        const checkPending = () => {
            const offlineTickets = JSON.parse(localStorage.getItem('offline_tickets') || '[]');
            setPendingCount(offlineTickets.length);
        };
        checkPending();
        const interval = setInterval(checkPending, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => setIsInstalled(true));
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleSync = async () => {
        if (isSyncing || !isOnline) return;
        setIsSyncing(true);
        try {
            const offlineTickets = JSON.parse(localStorage.getItem('offline_tickets') || '[]');
            for (const ticket of offlineTickets) {
                try {
                    const { id, timestamp, ...payload } = ticket;
                    const res = await fetch(`${API_BASE_URL}/tickets/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                        const current = JSON.parse(localStorage.getItem('offline_tickets') || '[]');
                        const newQueue = current.filter(t => t.id !== ticket.id);
                        localStorage.setItem('offline_tickets', JSON.stringify(newQueue));
                    }
                } catch (err) {
                    console.error('Failed to sync ticket', ticket.id, err);
                }
            }
            await queryClient.invalidateQueries();
            setPendingCount(0);
        } catch (err) {
            console.error('Sync failed:', err);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleInstall = async () => {
        if (!deferredPrompt) {
            alert('To install: Click the install icon in your browser address bar, or use browser menu > Install App');
            return;
        }
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
    };

    const prefetch = (key, fn) => {
        queryClient.prefetchQuery({ queryKey: key, queryFn: fn, staleTime: 1000 * 60 * 5 });
    };

    const navItems = [
        { icon: Home, label: 'Dashboard', path: '/' },
        { icon: Sparkles, label: 'Ask AI Assistant', path: '/ask-ai' },
        { icon: Activity, label: 'Analytics & Reports', path: '/analytics' },
        { icon: PenTool, label: 'Report Writer', path: '/reports/writer' },
        { icon: Users, label: 'Clients', path: '/clients', onHover: () => prefetch(['clients'], fetchClients) },
        { icon: Ticket, label: 'Tickets', path: '/tickets', onHover: () => prefetch(['tickets'], fetchTickets) },
        { icon: Monitor, label: 'Projects', path: '/projects' },
        { icon: Phone, label: 'Support Contacts', path: '/support', onHover: () => prefetch(['clients'], fetchClients) },
        { icon: ClipboardList, label: 'My To-Do', path: '/todo', onHover: () => prefetch(['todos', 'all'], () => fetchTodos('all')) },
        { icon: BookOpen, label: 'Documentation', path: '/docs' },
        { icon: FileText, label: 'Invoice Maker', path: '/invoices', onHover: () => prefetch(['invoices'], fetchInvoices) },
        { icon: Barcode, label: '4Genetics Serials', path: '/serials', onHover: () => prefetch(['serials'], fetchSerials) },
        { icon: CreditCard, label: 'Payment Tracker', path: '/payments', onHover: () => prefetch(['invoices'], fetchInvoices) },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className={`h-screen flex flex-col fixed left-0 top-0 overflow-hidden no-scrollbar transform transition-all duration-500 ease-out z-50 ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
            style={{
                background: isDark
                    ? 'linear-gradient(180deg, rgba(3,7,18,0.97) 0%, rgba(9,14,28,0.98) 50%, rgba(3,7,18,0.97) 100%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.98) 100%)',
                borderRight: `1px solid ${isDark ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.06)'}`,
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            }}
        >
            {/* Ambient Glow Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Top green accent glow */}
                <div
                    className="absolute -top-32 -left-32 w-96 h-96 rounded-full"
                    style={{
                        background: isDark
                            ? 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)',
                    }}
                />
                {/* Bottom blue accent glow */}
                <div
                    className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full"
                    style={{
                        background: isDark
                            ? 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)',
                    }}
                />
                {/* Vertical accent line */}
                <div
                    className="absolute top-0 right-0 w-px h-full"
                    style={{
                        background: isDark
                            ? 'linear-gradient(180deg, transparent 0%, rgba(34,197,94,0.15) 30%, rgba(34,197,94,0.25) 50%, rgba(34,197,94,0.15) 70%, transparent 100%)'
                            : 'linear-gradient(180deg, transparent 0%, rgba(34,197,94,0.1) 50%, transparent 100%)',
                    }}
                />
            </div>

            {/* Toggle Button */}
            <button
                onClick={toggleCollapse}
                className={`hidden md:flex absolute -right-4 top-20 w-8 h-8 rounded-full items-center justify-center z-50 transition-all duration-200 hover:scale-110 ${isDark
                    ? 'bg-gray-900 border-2 border-gray-600 text-gray-300 hover:text-green-400 hover:border-green-500 shadow-xl shadow-black/50'
                    : 'bg-white border-2 border-gray-300 text-gray-600 hover:text-green-600 hover:border-green-400 shadow-xl'
                    }`}
            >
                {isCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
            </button>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col h-full overflow-y-auto no-scrollbar overflow-x-hidden">
                {/* Logo Area */}
                <div className={`flex flex-col items-center w-full transition-all duration-300 ${isCollapsed ? 'px-2 pt-3 pb-2' : 'p-4 pb-2'}`}>
                    <Link to="/" className="relative block group mb-3 cursor-pointer flex justify-center">
                        {isCollapsed ? (
                            <img src="/logo.png" alt="UA" className="w-10 h-10 object-contain" />
                        ) : (
                            <img
                                src="/logo.png"
                                alt="Uniform Agri Logo"
                                className={`w-full max-w-[160px] h-auto object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03] ${isDark ? 'brightness-110' : ''}`}
                            />
                        )}
                    </Link>

                    {/* Search Trigger */}
                    {!isCollapsed ? (
                        <button
                            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-300 mb-1 group ${isDark
                                ? 'bg-white/[0.04] border border-white/[0.06] text-gray-500 hover:bg-white/[0.07] hover:border-green-500/20 hover:text-gray-300'
                                : 'bg-gray-50/80 border border-gray-200/60 text-gray-400 hover:border-green-300 hover:text-gray-600'
                                }`}
                        >
                            <span className="flex items-center gap-2.5">
                                <SearchIcon size={15} className="opacity-50" />
                                <span className="opacity-70 group-hover:opacity-100 transition-opacity">Search...</span>
                            </span>
                            <kbd className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isDark ? 'bg-white/[0.06] text-gray-500 border border-white/[0.08]' : 'bg-white text-gray-400 border border-gray-200'}`}>
                                ⌘K
                            </kbd>
                        </button>
                    ) : (
                        <button
                            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                            className={`w-full flex justify-center py-2.5 mb-1 rounded-xl transition-all duration-300 ${isDark
                                ? 'text-gray-500 hover:bg-white/[0.06] hover:text-green-400'
                                : 'text-gray-400 hover:bg-gray-100/80 hover:text-green-600'
                                }`}
                            title="Search (Ctrl+K)"
                        >
                            <SearchIcon size={18} />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 pb-2">
                    <div className="space-y-px">
                        {navItems.map((item, index) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                title={isCollapsed ? item.label : ''}
                                onMouseEnter={() => {
                                    setHoveredIndex(index);
                                    if (item.onHover) item.onHover();
                                }}
                                onMouseLeave={() => setHoveredIndex(null)}
                                onClick={() => {
                                    if (window.innerWidth < 768) onClose();
                                }}
                                className={({ isActive }) =>
                                    `group flex items-center gap-3 px-3 py-1.5 rounded-xl transition-colors duration-150 relative overflow-hidden ${isActive
                                        ? 'text-white'
                                        : isDark
                                            ? 'text-gray-400 hover:text-gray-100'
                                            : 'text-gray-600 hover:text-gray-900'
                                    } ${isCollapsed ? 'justify-center' : ''}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {/* Active background with gradient */}
                                        {isActive && (
                                            <div className="absolute inset-0 rounded-xl"
                                                style={{
                                                    background: 'linear-gradient(135deg, #16a34a 0%, #059669 50%, #0d9488 100%)',
                                                    boxShadow: isDark
                                                        ? '0 4px 15px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
                                                        : '0 4px 15px rgba(34,197,94,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                                                }}
                                            />
                                        )}

                                        {/* Hover background */}
                                        {!isActive && (
                                            <div
                                                className="absolute inset-0 rounded-xl transition-colors duration-150"
                                                style={{
                                                    background: hoveredIndex === index
                                                        ? isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
                                                        : 'transparent',
                                                }}
                                            />
                                        )}

                                        {/* Active indicator dot */}
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white/60" />
                                        )}

                                        {/* Icon */}
                                        <item.icon
                                            size={18}
                                            className={`relative z-10 shrink-0 transition-transform duration-150 ${hoveredIndex === index && !isActive ? 'scale-110' : ''}`}
                                        />

                                        {/* Label */}
                                        {!isCollapsed && (
                                            <span className="font-medium text-sm truncate relative z-10">
                                                {item.label}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>

                    {isAdmin && (
                        <div className={`pt-2 mt-2 border-t ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                            <a
                                href={`${API_BASE_URL.replace('/api', '')}/admin`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={isCollapsed ? "System Admin" : ""}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-150 ${isDark ? 'text-amber-400/70 hover:bg-white/[0.04] hover:text-amber-300' : 'text-amber-600/70 hover:bg-amber-50 hover:text-amber-700'} ${isCollapsed ? 'justify-center' : ''}`}
                            >
                                <Shield size={18} className="shrink-0" />
                                {!isCollapsed && <span className="font-medium text-sm truncate">System Admin</span>}
                            </a>
                        </div>
                    )}
                </nav>

                {/* Footer */}
                <div className={`p-2 border-t space-y-1.5 ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                    {/* User Info */}
                    <div className={`rounded-xl p-2 transition-all duration-300 ${!isCollapsed
                        ? isDark ? 'bg-white/[0.03]' : 'bg-gray-50/80'
                        : 'flex justify-center'
                        }`}>
                        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${isAdmin
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20'
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20'
                                }`}>
                                {isAdmin ? <Shield size={15} className="text-white" /> : <Monitor size={15} className="text-white" />}
                            </div>
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold text-sm truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{user?.username}</p>
                                    <p className={`text-[11px] font-medium ${isAdmin ? 'text-green-400' : 'text-blue-400'}`}>
                                        {isAdmin ? 'Administrator' : 'Viewer'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
}
