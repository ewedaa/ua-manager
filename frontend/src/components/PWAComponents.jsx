import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, CheckCircle } from 'lucide-react';

// Offline indicator component
export const OfflineIndicator = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowBanner(true);
            setTimeout(() => setShowBanner(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!showBanner && isOnline) return null;

    return (
        <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 ${isOnline
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white animate-pulse'
                }`}
        >
            {isOnline ? (
                <>
                    <Wifi size={16} />
                    Back online
                </>
            ) : (
                <>
                    <WifiOff size={16} />
                    You're offline - Data from cache
                </>
            )}
        </div>
    );
};

// PWA Install prompt component
export const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Listen for successful installation
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Don't show again for 24 hours
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    };

    // Check if dismissed recently
    useEffect(() => {
        const dismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (dismissed) {
            const hoursAgo = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60);
            if (hoursAgo < 24) {
                setShowPrompt(false);
            }
        }
    }, []);

    if (!showPrompt || isInstalled) return null;

    return (
        <div className="fixed bottom-20 right-4 z-[200] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4 max-w-xs animate-slide-up">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500/20 rounded-xl">
                    <Download className="text-green-400" size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-white">Install UA Manager</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Install this app for faster access and offline support
                    </p>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={handleInstall}
                            className="px-4 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                        >
                            Install
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="px-4 py-1.5 text-gray-400 text-sm hover:text-white transition-colors"
                        >
                            Not now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Installation success indicator (shows in standalone mode)
export const InstalledIndicator = () => {
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    }, []);

    if (!isStandalone) return null;

    return (
        <div className="fixed top-2 right-2 z-[200] px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle size={12} />
            Installed App
        </div>
    );
};
