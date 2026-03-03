import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Save, WifiOff, CheckCircle, Lock, Plus, Pencil, Trash2, X, Loader2, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

export default function NewTicket() {
    const { isAdmin } = useAuth();
    const { isDark } = useTheme();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const preselectedClientId = searchParams.get('clientId');

    const [formData, setFormData] = useState({
        client: preselectedClientId || '',
        contact_person: '',
        category: '',
        issue_description: '',
        status: 'Open'
    });
    const [notification, setNotification] = useState(null);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState(null);
    const [editName, setEditName] = useState('');

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

    // Fetch issue categories
    const { data: categories = [], refetch: refetchCategories } = useQuery({
        queryKey: ['issue-categories'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/issue-categories/`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        }
    });

    // Set default category when categories load
    useEffect(() => {
        if (categories.length > 0 && !formData.category) {
            setFormData(prev => ({ ...prev, category: categories[0].name }));
        }
    }, [categories]);

    // Get selected client's contacts
    const selectedClient = clients?.find(c => String(c.id) === String(formData.client));
    const clientContacts = selectedClient?.contacts || [];

    // Category CRUD
    const addCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/issue-categories/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategoryName.trim(), order: categories.length })
            });
            if (res.ok) {
                setNewCategoryName('');
                refetchCategories();
            } else {
                const err = await res.json();
                showNotification({ type: 'error', message: err.name?.[0] || 'Failed to add category' });
            }
        } catch { showNotification({ type: 'error', message: 'Network error' }); }
    };

    const updateCategory = async (id) => {
        if (!editName.trim()) return;
        try {
            await fetch(`${API_BASE_URL}/issue-categories/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName.trim() })
            });
            setEditingCategory(null);
            refetchCategories();
        } catch { showNotification({ type: 'error', message: 'Failed to update' }); }
    };

    const deleteCategory = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/issue-categories/${id}/`, { method: 'DELETE' });
            refetchCategories();
        } catch { showNotification({ type: 'error', message: 'Failed to delete' }); }
    };

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
                    setFormData({ ...formData, issue_description: '', contact_person: '' });
                    queryClient.invalidateQueries(['clients']);
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
            setFormData({ ...formData, issue_description: '', contact_person: '' });
        }
    };

    // Viewer mode - show restricted notice
    if (!isAdmin) {
        return (
            <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4 max-w-2xl mx-auto">
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
        <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4 max-w-2xl mx-auto animate-in fade-in duration-500">
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

            <form onSubmit={handleSubmit} className={`space-y-6 p-4 md:p-8 rounded-2xl border backdrop-blur-sm ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-gray-200'}`}>

                {/* Client / Farm Selection */}
                <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Select Farm
                    </label>
                    <select
                        required
                        className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-green-500 transition-all duration-300 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                        value={formData.client}
                        onChange={(e) => setFormData({ ...formData, client: e.target.value, contact_person: '' })}
                    >
                        <option value="">-- Select a Farm --</option>
                        {clients?.map(client => (
                            <option key={client.id} value={client.id}>
                                {client.name}
                            </option>
                        ))}
                    </select>
                    {preselectedClientId && selectedClient && (
                        <p className="mt-1.5 text-xs text-green-500">Auto-selected from client page</p>
                    )}
                </div>

                {/* Contact Person (shows contacts from selected client) */}
                {formData.client && (
                    <div className="animate-in fade-in duration-200">
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Contact Person
                        </label>
                        {clientContacts.length > 0 ? (
                            <select
                                className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-green-500 transition-all duration-300 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                                value={formData.contact_person}
                                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                            >
                                <option value="">-- Select Contact (optional) --</option>
                                {clientContacts.map(contact => (
                                    <option key={contact.id} value={`${contact.name} (${contact.role})`}>
                                        {contact.name} — {contact.role}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className={`p-3 rounded-xl border text-sm ${isDark ? 'bg-gray-900/50 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                No contacts added for this farm yet
                            </div>
                        )}
                    </div>
                )}

                {/* Issue Category */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Issue Category
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowCategoryManager(!showCategoryManager)}
                            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Settings size={12} />
                            Manage
                        </button>
                    </div>
                    <select
                        required
                        className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-green-500 transition-all duration-300 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    {/* Quick add — always visible */}
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
                            placeholder="Add new category..."
                            className={`flex-1 px-3 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-green-500 outline-none transition-all ${isDark ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 placeholder-gray-400'}`}
                        />
                        <button type="button" onClick={addCategory} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-colors" title="Add category">
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Inline Category Manager */}
                    {showCategoryManager && (
                        <div className={`mt-3 p-4 rounded-xl border animate-in fade-in duration-200 ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="space-y-2 mb-3">
                                {categories.map(cat => (
                                    <div key={cat.id} className={`flex items-center justify-between py-1.5 px-3 rounded-lg ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-white'}`}>
                                        {editingCategory === cat.id ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && updateCategory(cat.id)}
                                                    className={`flex-1 px-2 py-1 rounded-lg text-sm border ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                                                    autoFocus
                                                />
                                                <button type="button" onClick={() => updateCategory(cat.id)} className="text-green-500 hover:text-green-400"><CheckCircle size={16} /></button>
                                                <button type="button" onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-300"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{cat.name}</span>
                                                <div className="flex items-center gap-1">
                                                    <button type="button" onClick={() => { setEditingCategory(cat.id); setEditName(cat.name); }} className={`p-1 rounded transition-colors ${isDark ? 'text-gray-600 hover:text-blue-400' : 'text-gray-400 hover:text-blue-500'}`}>
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button type="button" onClick={() => deleteCategory(cat.id)} className={`p-1 rounded transition-colors ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Description
                    </label>
                    <textarea
                        required
                        rows={4}
                        className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-green-500 transition-all duration-300 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
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
