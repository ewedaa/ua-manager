import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, WifiOff, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { API_BASE_URL } from '../lib/api';

export default function NewTicket() {
    const { isAdmin } = useAuth();
    const [formData, setFormData] = useState({
        client: '',
        category: 'Database',
        issue_description: '',
        status: 'Open'
    });
    const [notification, setNotification] = useState(null);

    // Auto-dismiss notification after 5 seconds
    const showNotification = (notif) => {
        setNotification(notif);
        setTimeout(() => setNotification(null), 5000);
    };

    // Fetch clients for the dropdown
    const { data: clients } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/clients/`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Client-side validation
        if (!formData.issue_description.trim()) {
            showNotification({ type: 'error', message: 'Please provide a description of the issue.' });
            return;
        }
        if (!formData.client) {
            showNotification({ type: 'error', message: 'Please select a client.' });
            return;
        }

        // Check if online
        if (navigator.onLine) {
            try {
                const response = await fetch(`${API_BASE_URL}/tickets/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    showNotification({ type: 'success', message: 'Ticket created successfully!' });
                    setFormData({ ...formData, issue_description: '' });
                } else {
                    throw new Error('Failed to create ticket');
                }
            } catch (err) {
                showNotification({ type: 'error', message: 'Error submitting ticket' });
            }
        } else {
            // Offline Logic
            const offlineTickets = JSON.parse(localStorage.getItem('offline_tickets') || '[]');
            offlineTickets.push({ ...formData, id: Date.now(), timestamp: new Date().toISOString() });
            localStorage.setItem('offline_tickets', JSON.stringify(offlineTickets));

            showNotification({
                type: 'warning',
                message: 'You are offline. Ticket saved and will sync when reconnected.'
            });
            setFormData({ ...formData, issue_description: '' });
        }
    };

    // Viewer mode - show restricted notice
    if (!isAdmin) {
        return (
            <div className="px-4 pb-4 pt-2 md:px-8 md:pb-8 md:pt-6 max-w-2xl mx-auto">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-8">Create New Ticket</h1>

                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} className="text-blue-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Admin Access Required</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Only administrators can create new tickets. Please contact an admin if you need to submit a support request.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 pb-4 pt-2 md:px-8 md:pb-8 md:pt-6 max-w-2xl mx-auto animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Create New Ticket</h1>

            {notification && (
                <div className={`p-4 rounded-lg mb-6 flex items-center border ${notification.type === 'success' ? 'bg-green-500/15 text-green-400 border-green-500/20' :
                    notification.type === 'warning' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' :
                        'bg-red-500/15 text-red-400 border-red-500/20'
                    }`}>
                    {notification.type === 'success' && <CheckCircle className="mr-2" size={20} />}
                    {notification.type === 'warning' && <WifiOff className="mr-2" size={20} />}
                    {notification.message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-white/[0.03] p-4 md:p-8 rounded-2xl border border-gray-200 dark:border-white/[0.06] backdrop-blur-sm">

                {/* Client Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Client
                    </label>
                    <select
                        required
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 transition-all duration-300"
                        value={formData.client}
                        onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    >
                        <option value="">-- Select a Farm --</option>
                        {clients?.map(client => (
                            <option key={client.id} value={client.id}>
                                {client.farm_name} ({client.name})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Issue Category
                    </label>
                    <select
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 transition-all duration-300"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                        <option value="Database">Database</option>
                        <option value="Milk Meter">Milk Meter</option>
                        <option value="Activity System">Activity System</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                    </label>
                    <textarea
                        required
                        rows={4}
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 transition-all duration-300"
                        placeholder="Describe the issue..."
                        value={formData.issue_description}
                        onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/25"
                >
                    <Save className="mr-2" size={20} />
                    Submit Ticket
                </button>
            </form>
        </div>
    );
}
