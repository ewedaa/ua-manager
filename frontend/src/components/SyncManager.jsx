import { useEffect } from 'react';
import { API_BASE_URL } from '../lib/api';
import { queryClient } from '../lib/queryClient';

/**
 * SyncManager — invisible component that:
 * 1. Syncs offline-queued tickets when the network comes back.
 * 2. Forces a React Query invalidation whenever the window regains focus.
 */
export default function SyncManager() {
    useEffect(() => {
        // ── 1. Offline ticket sync ──────────────────────────────────
        const syncTickets = async () => {
            if (!navigator.onLine) return;

            const offlineTickets = JSON.parse(localStorage.getItem('offline_tickets') || '[]');
            if (offlineTickets.length === 0) return;

            console.log('Syncing offline tickets...', offlineTickets);

            for (const ticket of offlineTickets) {
                try {
                    const { id, timestamp, ...payload } = ticket;
                    const res = await fetch(`${API_BASE_URL}/tickets/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    if (res.ok) {
                        const current = JSON.parse(localStorage.getItem('offline_tickets') || '[]');
                        localStorage.setItem(
                            'offline_tickets',
                            JSON.stringify(current.filter(t => t.id !== ticket.id))
                        );
                    }
                } catch {
                    console.error('Failed to sync ticket', ticket.id);
                }
            }
        };

        // ── 2. Force refetch on window focus ────────────────────────
        // React Query sometimes misses focus events with PersistQueryClientProvider
        const handleFocus = () => {
            if (navigator.onLine) {
                console.log('Window focused: Forcing data refresh...');
                queryClient.invalidateQueries();
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') handleFocus();
        };

        window.addEventListener('online', syncTickets);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        // Run once on mount in case we were offline and just came back
        syncTickets();

        return () => {
            window.removeEventListener('online', syncTickets);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    return null;
}
