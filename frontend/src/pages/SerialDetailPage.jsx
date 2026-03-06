import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';
import {
    ArrowLeft, Barcode, Calendar, Building2,
    ToggleRight, ToggleLeft, Trash2,
    Clock, StickyNote, Loader2, AlertTriangle,
    CheckCircle, Copy
} from 'lucide-react';

export default function SerialDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const queryClient = useQueryClient();
    const [copiedField, setCopiedField] = useState(null);

    const { data: serial, isLoading, error } = useQuery({
        queryKey: ['serial', id],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/genetics-serials/${id}/`);
            if (!res.ok) throw new Error('Failed to fetch serial details');
            return res.json();
        },
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
                    <div className="flex items-center gap-2">
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
        </div>
    );
}
