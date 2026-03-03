import React, { useState } from 'react';
import { X, Save, Loader2, UserPlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

export default function AddContactModal({ clientId, clientName, onClose }) {
    const { isDark } = useTheme();
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({ name: '', phone: '', role: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('Contact name is required'); return; }

        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/contacts/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to add contact');
            }
            queryClient.invalidateQueries(['clients']);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const inputClass = `w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all focus:ring-2 focus:ring-green-500 outline-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`;
    const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={onClose}>
            <div className={`rounded-xl shadow-2xl w-full max-w-md ${isDark ? 'bg-gray-900/95 backdrop-blur-xl border border-white/[0.08]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-green-500/10' : 'bg-green-50'}`}>
                            <UserPlus size={18} className="text-green-500" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Contact</h2>
                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{clientName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className={`p-3 rounded-lg text-sm font-medium ${isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600'}`}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>Contact Name *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Ahmed Hassan"
                            className={inputClass}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Role</label>
                        <input
                            type="text"
                            value={form.role}
                            onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                            placeholder="e.g. Manager, Herdsman, Owner"
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Phone Number</label>
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="e.g. 01271444453"
                            className={inputClass}
                        />
                    </div>

                    <div className={`flex justify-end gap-3 pt-2`}>
                        <button type="button" onClick={onClose} className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${isDark ? 'text-gray-400 hover:bg-white/[0.06]' : 'text-gray-500 hover:bg-gray-100'}`}>
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Contact
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
