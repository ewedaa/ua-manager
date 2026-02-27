import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle, Bell } from 'lucide-react';

const priorityConfig = {
    urgent: {
        gradient: 'from-red-600/90 to-rose-700/90',
        accent: '#ef4444',
        glow: 'shadow-red-500/30',
        icon: AlertCircle,
        label: 'URGENT',
    },
    high: {
        gradient: 'from-orange-500/90 to-amber-600/90',
        accent: '#f97316',
        glow: 'shadow-orange-500/30',
        icon: AlertTriangle,
        label: 'HIGH',
    },
    medium: {
        gradient: 'from-blue-500/90 to-indigo-600/90',
        accent: '#3b82f6',
        glow: 'shadow-blue-500/30',
        icon: Info,
        label: 'MEDIUM',
    },
    low: {
        gradient: 'from-emerald-500/90 to-green-600/90',
        accent: '#22c55e',
        glow: 'shadow-green-500/30',
        icon: CheckCircle,
        label: 'LOW',
    },
};

function ToastItem({ toast, onRemove, index, total }) {
    const [progress, setProgress] = useState(100);
    const [isExiting, setIsExiting] = useState(false);
    const config = priorityConfig[toast.priority] || priorityConfig.medium;
    const Icon = config.icon;

    // Countdown progress bar
    useEffect(() => {
        const duration = 5000;
        const interval = 50;
        const step = (interval / duration) * 100;
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - step;
            });
        }, interval);
        return () => clearInterval(timer);
    }, []);

    // Exit animation before removal
    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
    };

    // Stacked offset: newer toasts stack on top with slight scale reduction
    const stackOffset = (total - 1 - index) * 4;
    const stackScale = 1 - (total - 1 - index) * 0.03;

    return (
        <div
            className={`
                pointer-events-auto flex flex-col rounded-2xl overflow-hidden
                min-w-[360px] max-w-[420px]
                backdrop-blur-xl border border-white/15
                shadow-2xl ${config.glow}
                transition-all duration-300 ease-out
                ${isExiting ? 'toast-slide-out' : 'toast-slide-in'}
            `}
            style={{
                transform: `translateY(-${stackOffset}px) scale(${stackScale})`,
                zIndex: 100 + index,
            }}
        >
            {/* Main Content */}
            <div className={`bg-gradient-to-r ${config.gradient} px-4 py-3 flex items-center gap-3`}>
                {/* Accent icon */}
                <div className="flex-shrink-0 p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Icon size={18} className="text-white" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
                            {config.label}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-white truncate">
                        {toast.message}
                    </p>
                </div>

                {/* Close */}
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1.5 hover:bg-white/20 rounded-xl transition-all duration-200 text-white/70 hover:text-white"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-black/20 w-full">
                <div
                    className="h-full transition-all duration-75 ease-linear rounded-full"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: config.accent,
                        boxShadow: `0 0 8px ${config.accent}`,
                    }}
                />
            </div>
        </div>
    );
}

export default function NotificationToasts() {
    const { toasts, removeToast } = useNotifications();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-3 pointer-events-none">
            {toasts.map((toast, index) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onRemove={removeToast}
                    index={index}
                    total={toasts.length}
                />
            ))}
        </div>
    );
}
