import React, { useState } from 'react';
import { Users, X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

/**
 * QuickAddClientModal — reusable modal to create a new client/farm inline
 * without navigating away from the current page.
 *
 * Props:
 *   onClose()             — called to close the modal
 *   onCreated(client)     — called with the newly-created client object
 */
export default function QuickAddClientModal({ onClose, onCreated }) {
    const { isDark } = useTheme();
    const queryClient = useQueryClient();
    const today = new Date().toISOString().split('T')[0];
    const oneYear = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

    const [form, setForm] = useState({
        farm_name: '',
        name: '',
        phone: '',
        subscription_start_date: today,
        subscription_end_date: oneYear,
        is_demo: false,
        is_4genetics_college: false,
        general_notes: '',
        serial_number: '',
        livestock_type: 'Dairy Cows',
        role: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const field = (key, value) => setForm(f => ({ ...f, [key]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/clients/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    phone: form.phone || '—',
                    demo_start_date: form.is_demo ? today : null,
                    demo_end_date: form.is_demo ? form.subscription_end_date : null,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(Object.values(err).flat().join(' ') || 'Failed to create client');
            }
            const newClient = await res.json();

            if (form.is_4genetics_college) {
                try {
                    await fetch(`${API_BASE_URL}/genetics-serials/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            serial_number: form.serial_number || `4G-${Date.now()}`,
                            client: newClient.id,
                            product_type: form.livestock_type || 'Dairy Cows',
                            role: form.role || '',
                            is_active: true,
                            notes: 'Auto-enrolled from quick add modal'
                        })
                    });
                } catch (e) {
                    console.error('Failed to create genetics serial', e);
                }
            }

            queryClient.invalidateQueries(['clients']);
            queryClient.invalidateQueries(['dashboardStats']);
            onCreated(newClient);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const inp = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-green-500 ${isDark
        ? 'bg-white/[0.05] border-white/[0.10] text-white placeholder:text-gray-600'
        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'
        }`;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-in fade-in duration-200">
            <div className={`rounded-2xl border w-full max-w-md shadow-2xl ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 pt-5 pb-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center">
                            <Users size={18} className="text-green-400" />
                        </div>
                        <div>
                            <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>New Farm / Client</h2>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Added instantly — no page reload</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Farm Name *</label>
                            <input required value={form.farm_name} onChange={e => field('farm_name', e.target.value)} placeholder="e.g. Al-Amar Farm" className={inp} />
                        </div>
                        <div className="col-span-2">
                            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact Name *</label>
                            <input required value={form.name} onChange={e => field('name', e.target.value)} placeholder="Owner / manager name" className={inp} />
                        </div>
                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Phone</label>
                            <input value={form.phone} onChange={e => field('phone', e.target.value)} placeholder="+20 100 000 0000" className={inp} />
                        </div>
                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Livestock Type *</label>
                            <select value={form.livestock_type} onChange={e => field('livestock_type', e.target.value)} className={inp}>
                                <option value="Dairy Cows">Dairy Cows</option>
                                <option value="Dairy Buffalos">Dairy Buffalos</option>
                                <option value="Fattening">Fattening</option>
                                <option value="Sheep and Goat">Sheep and Goat</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Status</label>
                            <div className="flex gap-2 mt-1">
                                <button type="button" onClick={() => field('is_demo', false)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${!form.is_demo ? 'bg-green-600 border-green-500 text-white' : isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                    Active
                                </button>
                                <button type="button" onClick={() => field('is_demo', true)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.is_demo ? 'bg-amber-500 border-amber-400 text-white' : isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                    Demo
                                </button>
                            </div>
                        </div>

                        <div className="col-span-2 flex items-center gap-2 mt-1 px-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={form.is_4genetics_college}
                                    onChange={(e) => field('is_4genetics_college', e.target.checked)}
                                    className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 bg-white dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                />
                                <span className={`text-sm font-medium transition-colors ${isDark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                    This is a 4Genetics College
                                </span>
                            </label>
                        </div>

                        {form.is_4genetics_college && (
                            <div className="col-span-2 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300 border-l-2 border-green-500 pl-3 ml-1 mb-1 relative">
                                <div className="col-span-2">
                                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>College Serial Number</label>
                                    <input value={form.serial_number} onChange={e => field('serial_number', e.target.value)} placeholder="Auto-generated if empty" className={inp} />
                                </div>
                                <div className="col-span-2">
                                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>College Role</label>
                                    <input value={form.role} onChange={e => field('role', e.target.value)} placeholder="e.g. Professor, Lab Manager" className={inp} />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Start Date *</label>
                            <input required type="date" value={form.subscription_start_date} onChange={e => field('subscription_start_date', e.target.value)} className={inp} />
                        </div>
                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>End Date *</label>
                            <input required type="date" value={form.subscription_end_date} onChange={e => field('subscription_end_date', e.target.value)} className={inp} />
                        </div>
                        <div className="col-span-2">
                            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Notes</label>
                            <textarea rows={2} value={form.general_notes} onChange={e => field('general_notes', e.target.value)} placeholder="Any additional notes..." className={`${inp} resize-none`} />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl border font-medium text-sm transition-colors ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                            {saving ? 'Saving…' : 'Add Farm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
