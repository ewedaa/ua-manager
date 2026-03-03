import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit2, Trash2, Loader2, Barcode, X, Check, ToggleLeft, ToggleRight, FileDown, Printer } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

import { fetchSerials, fetchClients } from '../lib/fetchers';

const API = API_BASE_URL;

const PRODUCT_TYPES = ['Milk Meter', 'Activity Collar', 'Rumination Tag', 'Controller', 'Antenna', 'Router'];

const badgeColor = {
    'Milk Meter': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'Activity Collar': 'bg-green-500/15 text-green-400 border-green-500/20',
    'Rumination Tag': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    'Controller': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'Antenna': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    'Router': 'bg-rose-500/15 text-rose-400 border-rose-500/20',
};

export default function SerialsPage() {
    const { isDark } = useTheme();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ serial_number: '', product_type: 'Milk Meter', client: '', notes: '', is_active: true });
    const [formError, setFormError] = useState('');

    const { data: serials = [], isLoading } = useQuery({
        queryKey: ['serials'],
        queryFn: fetchSerials,
    });

    const { data: clients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: fetchClients,
    });

    const saveMutation = useMutation({
        mutationFn: (data) => {
            const url = editingId ? `${API}/genetics-serials/${editingId}/` : `${API}/genetics-serials/`;
            return fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, client: data.client || null }),
            }).then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); });
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['serials'] }); closeModal(); },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => fetch(`${API}/genetics-serials/${id}/`, { method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['serials'] }),
    });

    const toggleActive = useMutation({
        mutationFn: ({ id, is_active }) => fetch(`${API}/genetics-serials/${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !is_active }),
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['serials'] }),
    });

    const closeModal = () => { setShowModal(false); setEditingId(null); setForm({ serial_number: '', product_type: 'Milk Meter', client: '', notes: '', is_active: true }); setFormError(''); };
    const openEdit = (s) => { setEditingId(s.id); setForm({ serial_number: s.serial_number, product_type: s.product_type, client: s.client || '', notes: s.notes || '', is_active: s.is_active }); setShowModal(true); };

    const filtered = serials.filter(s => {
        const matchSearch = !search || s.serial_number?.toLowerCase().includes(search.toLowerCase()) || s.client_name?.toLowerCase().includes(search.toLowerCase());
        const matchType = !filterType || s.product_type === filterType;
        return matchSearch && matchType;
    });

    const stats = {
        total: serials.length,
        active: serials.filter(s => s.is_active).length,
        assigned: serials.filter(s => s.client).length,
        unassigned: serials.filter(s => !s.client && s.is_active).length,
    };

    return (
        <div className="px-4 pb-4 pt-1 md:px-6 md:pb-6 md:pt-3 space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-3xl font-extrabold tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <Barcode className="text-green-500" size={28} />
                        4Genetics Serials
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage device serial numbers and assignments</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={async () => {
                        if (!serials?.length) return;
                        const XLSX = await import('xlsx');
                        const data = serials.map(s => ({
                            'Serial Number': s.serial_number,
                            'Product Type': s.product_type,
                            'Client': s.client_name || 'Unassigned',
                            'Active': s.is_active ? 'Yes' : 'No',
                            'Created': new Date(s.created_at).toLocaleDateString()
                        }));
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Serials");
                        XLSX.writeFile(wb, "serials_list.xlsx");
                    }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <FileDown size={18} /> Export
                    </button>
                    <button onClick={() => window.print()} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <Printer size={18} /> Print
                    </button>
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:scale-105 transition-transform duration-200 shadow-lg shadow-green-500/20">
                        <Plus size={18} /> Add Serial
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'text-blue-400' },
                    { label: 'Active', value: stats.active, color: 'text-green-400' },
                    { label: 'Assigned', value: stats.assigned, color: 'text-purple-400' },
                    { label: 'Unassigned', value: stats.unassigned, color: 'text-amber-400' },
                ].map(s => (
                    <div key={s.label} className={`rounded-xl p-4 border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-gray-100'}`}>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{s.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search serial number or client..."
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'} focus:ring-2 focus:ring-green-500 outline-none`}
                    />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none`}>
                    <option value="">All Types</option>
                    {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-green-500" size={32} /></div>
            ) : (
                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-100'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                            <thead>
                                <tr className={isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Product Type</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                                {filtered.map(s => (
                                    <tr key={s.id} className={`transition-colors duration-100 ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'}`}>
                                        <td className="px-5 py-3.5 font-mono text-sm text-gray-900 dark:text-gray-200">{s.serial_number}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${badgeColor[s.product_type] || 'bg-gray-500/15 text-gray-400'}`}>
                                                {s.product_type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">{s.client_name || <span className="opacity-40">Unassigned</span>}</td>
                                        <td className="px-5 py-3.5">
                                            <button onClick={() => toggleActive.mutate({ id: s.id, is_active: s.is_active })} className="flex items-center gap-1.5 group">
                                                {s.is_active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
                                                <span className={`text-xs font-medium ${s.is_active ? 'text-green-500' : 'text-gray-400'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                                            </button>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 transition-colors"><Edit2 size={15} /></button>
                                                <button onClick={() => { if (confirm('Delete this serial?')) deleteMutation.mutate(s.id); }} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">No serials found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeModal}>
                    <div onClick={e => e.stopPropagation()} className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? 'Edit Serial' : 'Add Serial'}</h3>
                            <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X size={18} /></button>
                        </div>
                        <form onSubmit={e => {
                            e.preventDefault();
                            setFormError('');
                            if (!form.serial_number.trim()) {
                                setFormError('Serial number is required.');
                                return;
                            }
                            const duplicate = serials.find(s => s.serial_number.toLowerCase() === form.serial_number.trim().toLowerCase() && s.id !== editingId);
                            if (duplicate) {
                                setFormError(`Serial number "${form.serial_number.trim()}" already exists (assigned to ${duplicate.client_name || 'unassigned'}).`);
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
                                }} className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200'} outline-none focus:ring-2 focus:ring-green-500`} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Type</label>
                                <select value={form.product_type} onChange={e => setForm(f => ({ ...f, product_type: e.target.value }))} className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none`}>
                                    {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign to Client</label>
                                <select value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none`}>
                                    <option value="">Unassigned</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.farm_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none resize-none`} />
                            </div>
                            <button type="submit" disabled={saveMutation.isPending} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:scale-[1.02] transition-transform disabled:opacity-50">
                                {saveMutation.isPending ? <Loader2 className="animate-spin mx-auto" size={18} /> : (editingId ? 'Update' : 'Create')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
