import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';
import {
    ArrowLeft, Barcode, Calendar, Building2,
    ToggleRight, ToggleLeft, Trash2,
    Clock, StickyNote, Loader2, AlertTriangle,
    CheckCircle, Copy, Pencil, X
} from 'lucide-react';

const PRODUCT_TYPES = ['Dairy Cows', 'Dairy Buffalos', 'Fattening', 'Sheep and Goat'];

export default function SerialDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const queryClient = useQueryClient();
    const [copiedField, setCopiedField] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [form, setForm] = useState({ serial_number: '', product_type: '', college_name: '', role: '', modules: '', notes: '', is_active: true, start_date: '', end_date: '' });
    const [formError, setFormError] = useState('');

    const { data: serial, isLoading, error } = useQuery({
        queryKey: ['serial', id],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/genetics-serials/${id}/`);
            if (!res.ok) throw new Error('Failed to fetch serial details');
            const data = await res.json();
            // Initialize form when data is loaded
            setForm({
                serial_number: data.serial_number || '',
                product_type: data.product_type || 'Dairy Cows',
                college_name: data.college_name || '',
                role: data.role || '',
                modules: data.modules || '',
                notes: data.notes || '',
                is_active: data.is_active,
                start_date: data.start_date || '',
                end_date: data.end_date || ''
            });
            return data;
        },
    });

    const { data: availableModules = [] } = useQuery({
        queryKey: ['subscription-modules'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/subscription-modules/`);
            if (!res.ok) throw new Error('Failed to fetch modules');
            return res.json();
        },
    });

    const { data: allSerials = [] } = useQuery({
        queryKey: ['serials'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/genetics-serials/`);
            if (!res.ok) throw new Error('Failed to fetch serials');
            return res.json();
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`${API_BASE_URL}/genetics-serials/${id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                let errMsg = 'Failed to save serial';
                try {
                    const errData = await res.json();
                    errMsg = typeof errData === 'object' ? Object.values(errData).flat().join(' ') : 'Failed';
                } catch {
                    // Error parsing JSON or network error fallback handled by errMsg
                }
                throw new Error(errMsg);
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['serial', id]);
            queryClient.invalidateQueries(['serials']);
            setShowEditModal(false);
        },
        onError: (err) => setFormError(err.message),
    });

    const toggleActive = useMutation({
        mutationFn: async (is_active) => {
            const res = await fetch(`${API_BASE_URL}/genetics-serials/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !is_active }),
            });
            if (!res.ok) throw new Error('Failed to update status');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['serial', id]);
            queryClient.invalidateQueries(['serials']);
        },
    });

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1500);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 size={40} className="text-green-500 animate-spin" />
            </div>
        );
    }

    if (error || !serial) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertTriangle size={48} className="text-amber-500" />
                <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Serial not found</p>
                <button onClick={() => navigate('/serials')} className="px-4 py-2 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors">
                    Back to Serials
                </button>
            </div>
        );
    }

    const badgeColor = {
        'Dairy Cows': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
        'Dairy Buffalos': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
        'Fattening': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        'Sheep and Goat': 'bg-green-500/15 text-green-400 border-green-500/20',
    };

    const inputClass = `w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-2 focus:ring-green-500`;

    return (
        <div className={`min-h-screen ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
            {/* Top Navigation Bar */}
            <div className={`sticky top-0 z-30 backdrop-blur-xl border-b ${isDark ? 'bg-gray-950/80 border-white/[0.06]' : 'bg-white/80 border-gray-200'}`}>
                <div className="px-4 md:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/serials')} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.06] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                                <Barcode size={22} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold leading-tight">{serial.serial_number}</h1>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{serial.product_type} Serial</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowEditModal(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-gray-300' : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 shadow-sm'}`}
                        >
                            <Pencil size={14} />
                            Edit Serial
                        </button>
                        <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest ${serial.is_active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${serial.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}`} />
                            {serial.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Core Info Cards */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Serial Identifier Card */}
                        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] block mb-1">Serial Number</label>
                                    <div className="flex items-center justify-between group">
                                        <p className="text-xl font-mono font-bold tracking-tight text-green-500">{serial.serial_number}</p>
                                        <button onClick={() => handleCopy(serial.serial_number, 'serial')} className={`p-2 rounded-lg transition-all ${copiedField === 'serial' ? 'text-green-500 bg-green-500/10' : 'text-gray-500 hover:bg-white/[0.06]'}`}>
                                            {copiedField === 'serial' ? <CheckCircle size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/[0.04]">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] block mb-2">Assignment Status</label>
                                    <button
                                        onClick={() => toggleActive.mutate(serial.is_active)}
                                        disabled={toggleActive.isPending}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${serial.is_active
                                            ? 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
                                            : 'bg-gray-500/10 border border-gray-500/20 text-gray-400 hover:bg-gray-500/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {serial.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                            <span className="text-sm font-bold">{serial.is_active ? 'Mark as Inactive' : 'Mark as Active'}</span>
                                        </div>
                                        {toggleActive.isPending && <Loader2 size={16} className="animate-spin" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Metrics */}
                        <div className="grid grid-cols-1 gap-3">
                            <div className={`rounded-2xl border p-4 flex items-center gap-4 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Calendar size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Created On</p>
                                    <p className="text-sm font-bold">{serial.created_at ? new Date(serial.created_at).toLocaleDateString(undefined, { dateStyle: 'long' }) : '—'}</p>
                                </div>
                            </div>
                            <div className={`rounded-2xl border p-4 flex items-center gap-4 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                    <Clock size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Last Updated</p>
                                    <p className="text-sm font-bold">{serial.updated_at ? new Date(serial.updated_at).toLocaleDateString(undefined, { dateStyle: 'long' }) : '—'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Detailed Assignment & Modules */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Assignment Detail Section */}
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className={`px-6 py-4 border-b ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'}`}>
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    <Building2 size={16} className="text-green-500" />
                                    Assignment Details
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">College / Farm Name</p>
                                        <p className={`text-base font-bold ${serial.college_name ? '' : 'text-gray-500 italic'}`}>
                                            {serial.college_name || 'Unassigned'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">User Role</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                                                {serial.role || 'Not Specified'}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Product Type</p>
                                        <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border ${badgeColor[serial.product_type] || 'bg-gray-500/15 text-gray-400'}`}>
                                            {serial.product_type}
                                        </span>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Assigned Modules</p>
                                        <div className="flex flex-wrap gap-2">
                                            {serial.modules ? serial.modules.split(',').map((mod, i) => (
                                                <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                                    <CheckCircle size={10} />
                                                    <span className="text-xs font-bold">{mod.trim()}</span>
                                                </div>
                                            )) : (
                                                <p className="text-xs text-gray-500 italic">No modules assigned.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Validity Dates */}
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className={`px-6 py-4 border-b ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'}`}>
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    <Clock size={16} className="text-blue-500" />
                                    Validity Period
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.01] border-white/[0.04]' : 'bg-gray-50 border-gray-100'}`}>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subscription Start</p>
                                        <div className="flex items-center gap-3">
                                            <Calendar size={18} className="text-blue-500" />
                                            <p className="text-sm font-bold">{serial.start_date || '—'}</p>
                                        </div>
                                    </div>
                                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.01] border-white/[0.04]' : 'bg-gray-50 border-gray-100'}`}>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subscription End</p>
                                        <div className="flex items-center gap-3">
                                            <Calendar size={18} className="text-red-500" />
                                            <p className="text-sm font-bold">{serial.end_date || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className={`px-6 py-4 border-b ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'}`}>
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    <StickyNote size={16} className="text-amber-500" />
                                    Internal Notes
                                </h2>
                            </div>
                            <div className="p-6">
                                {serial.notes ? (
                                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {serial.notes}
                                    </p>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-4 text-center">
                                        <StickyNote size={24} className="text-gray-700 mb-2 opacity-20" />
                                        <p className="text-xs text-gray-500 font-medium">No internal notes for this serial.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
                    <div onClick={e => e.stopPropagation()} className={`w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] flex flex-col ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
                        {/* Header */}
                        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06] bg-gray-900/95 backdrop-blur-sm' : 'border-gray-100 bg-white/95 backdrop-blur-sm'}`}>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Serial</h3>
                            <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X size={18} /></button>
                        </div>
                        {/* Body */}
                        <div className="overflow-y-auto p-6 pt-5">
                            <form onSubmit={e => {
                                e.preventDefault();
                                setFormError('');
                                if (!form.serial_number.trim()) {
                                    setFormError('Serial number is required.');
                                    return;
                                }
                                const duplicate = allSerials.find(s => s.serial_number.toLowerCase() === form.serial_number.trim().toLowerCase() && s.id != id);
                                if (duplicate) {
                                    setFormError(`Serial number "${form.serial_number.trim()}" already exists (assigned to ${duplicate.college_name || 'unassigned'}).`);
                                    return;
                                }
                                saveMutation.mutate(form);
                            }} className="space-y-4">
                                {formError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                        {formError}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
                                    <input required value={form.serial_number} onChange={e => {
                                        let val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                                        val = val.match(/.{1,4}/g)?.join('-') || '';
                                        val = val.substring(0, 24);
                                        setForm(f => ({ ...f, serial_number: val }));
                                    }} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Livestock Type</label>
                                    <select value={form.product_type} onChange={e => setForm(f => ({ ...f, product_type: e.target.value }))} className={inputClass}>
                                        {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">College Name</label>
                                    <input
                                        value={form.college_name}
                                        onChange={e => setForm(f => ({ ...f, college_name: e.target.value }))}
                                        placeholder="e.g. Yasha' Farm"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role Type</label>
                                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputClass}>
                                        <option value="">Select a role type...</option>
                                        <option value="4GENETICS EMPLOYEE">4GENETICS EMPLOYEE</option>
                                        <option value="MILITARY FARM">MILITARY FARM</option>
                                        <option value="OTHER">OTHER</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modules</label>
                                    <div className={`grid grid-cols-2 gap-2 p-3 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-100'}`}>
                                        {availableModules.length > 0 ? availableModules.map((mod) => (
                                            <label key={mod.id} className={`flex items-center space-x-2 text-sm cursor-pointer p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:bg-white/[0.06]' : 'text-gray-700 hover:bg-gray-100'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={(form.modules || '').includes(mod.name)}
                                                    onChange={(e) => {
                                                        const current = (form.modules || '').split(',').map(s => s.trim()).filter(Boolean);
                                                        let updated;
                                                        if (e.target.checked) {
                                                            updated = [...current, mod.name];
                                                        } else {
                                                            updated = current.filter(m => m !== mod.name);
                                                        }
                                                        setForm(f => ({ ...f, modules: updated.join(', ') }));
                                                    }}
                                                    className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300"
                                                />
                                                <span>{mod.name}</span>
                                            </label>
                                        )) : (
                                            <p className="col-span-2 text-xs text-gray-400 italic">No modules configured. Add them in Settings.</p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                        <input type="date" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                        <input type="date" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className={inputClass} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={`${inputClass} resize-none`} />
                                </div>
                                <button type="submit" disabled={saveMutation.isPending} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:scale-[1.02] transition-transform disabled:opacity-50 shadow-lg shadow-green-500/20">
                                    {saveMutation.isPending ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Update Serial'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
