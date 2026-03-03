import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search, Loader2, CreditCard, FileDown, Plus, X, Check,
    ChevronUp, ChevronDown, StickyNote, Edit2, Save
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

const API = API_BASE_URL;

// ─── Status badge config ──────────────────────────────────────────────
const STATUS_OPTIONS = ['Yes', 'No', 'Cancelled', 'Unknown'];

const STATUS_STYLE = {
    Yes: 'bg-green-500/15 text-green-400 border border-green-500/25 dark:bg-green-500/10',
    No: 'bg-red-500/15 text-red-400 border border-red-500/25 dark:bg-red-500/10',
    Cancelled: 'bg-red-500/15 text-red-400 border border-red-500/25 dark:bg-red-500/10 line-through',
    Unknown: 'bg-gray-500/15 text-gray-400 border border-gray-500/25 dark:bg-gray-500/10',
};

function StatusBadge({ value, onChange, editable = true }) {
    const [open, setOpen] = useState(false);
    const style = STATUS_STYLE[value] || STATUS_STYLE['Unknown'];

    if (!editable) {
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${style}`}>
                {value || 'Unknown'}
            </span>
        );
    }

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${style}`}
            >
                {value || 'Unknown'}
                <ChevronDown size={10} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 z-50 w-32 rounded-xl border border-white/10 shadow-2xl bg-gray-900/95 backdrop-blur-xl overflow-hidden">
                    {STATUS_OPTIONS.map(opt => (
                        <button
                            key={opt}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange(opt); setOpen(false); }}
                            className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors ${value === opt ? 'font-bold' : ''}`}
                        >
                            <span className={`w-2 h-2 rounded-full ${opt === 'Yes' ? 'bg-green-400' : opt === 'Unknown' ? 'bg-gray-400' : 'bg-red-400'}`} />
                            <span className="text-gray-200">{opt}</span>
                            {value === opt && <Check size={10} className="ml-auto text-green-400" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function PaymentTracker() {
    const { isDark } = useTheme();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [sortCol, setSortCol] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [editingNote, setEditingNote] = useState(null); // {id, text}

    const { data: invoices = [], isLoading } = useQuery({
        queryKey: ['invoices'],
        queryFn: () => fetch(`${API}/invoices/`).then(r => r.json()),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, patch }) => {
            const res = await fetch(`${API}/invoices/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            });
            if (!res.ok) throw new Error('Update failed');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries(['invoices']),
    });

    // Map invoice_type → Notion-style Product/Service label
    const productLabel = (type) => {
        if (!type) return 'Unknown';
        if (type.toLowerCase().includes('renewal')) return 'Renewal';
        if (type.toLowerCase().includes('purchase')) return 'Purchase new licence';
        return type;
    };

    // Sort handler
    const handleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };

    // Filter + sort
    const rows = invoices
        .filter(inv => {
            if (!search) return true;
            const q = search.toLowerCase();
            return (
                (inv.client_name || '').toLowerCase().includes(q) ||
                String(inv.id).includes(q) ||
                (inv.invoice_type || '').toLowerCase().includes(q) ||
                (inv.notes || '').toLowerCase().includes(q)
            );
        })
        .sort((a, b) => {
            let av = a[sortCol] ?? '';
            let bv = b[sortCol] ?? '';
            if (sortCol === 'created_at') { av = new Date(av); bv = new Date(bv); }
            if (sortCol === 'cost_total') { av = parseFloat(av) || 0; bv = parseFloat(bv) || 0; }
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

    // Summary stats
    const totalDue = invoices.filter(i => i.status === 'Due').reduce((s, i) => s + parseFloat(i.customer_total || i.total_amount || 0), 0);
    const totalPaidUs = invoices.filter(i => i.status === 'Paid to Us').reduce((s, i) => s + parseFloat(i.customer_total || i.total_amount || 0), 0);
    const totalPaidUniform = invoices.filter(i => i.status === 'Paid to Uniform').reduce((s, i) => s + parseFloat(i.cost_total || 0), 0);

    // Invoice # format matching Notion convention: V + YY + padded invoice id
    const invoiceNumber = (inv) => {
        const year = new Date(inv.created_at).getFullYear().toString().slice(2);
        return `V${year}${String(inv.id).padStart(6, '0')}`;
    };

    // SortIcon
    const SortIcon = ({ col }) => {
        if (sortCol !== col) return <ChevronUp size={12} className="opacity-20" />;
        return sortDir === 'asc' ? <ChevronUp size={12} className="text-green-400" /> : <ChevronDown size={12} className="text-green-400" />;
    };

    const thClass = `px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} whitespace-nowrap transition-colors`;

    return (
        <div className="px-2 pb-8 pt-2 md:px-6 md:pt-4 space-y-5 animate-in fade-in duration-400">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <CreditCard className="text-green-500" size={28} />
                        Uniform-Agri Payment Tracker
                    </h1>
                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Track invoices, farm payments, and Uniform Agri dues
                    </p>
                </div>

                {/* Export button */}
                <button
                    onClick={async () => {
                        const XLSX = await import('xlsx');
                        const data = rows.map(inv => ({
                            'Invoice #': invoiceNumber(inv),
                            'Date': new Date(inv.created_at).toLocaleDateString(),
                            'Farm Name': inv.client_name,
                            'Product/Service': productLabel(inv.invoice_type),
                            'Amount to Uniform (€)': parseFloat(inv.cost_total || 0).toFixed(2),
                            'Farm Paid?': parseToStatus(inv.status),
                            'We Paid to Uniform?': inv.paid_to_uniform || 'Unknown',
                            'Notes': inv.notes || '',
                        }));
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Payment Tracker');
                        XLSX.writeFile(wb, 'uniform_agri_payment_tracker.xlsx');
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border text-sm transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                    <FileDown size={16} /> Export Excel
                </button>
            </div>

            {/* ── Summary chips ── */}
            <div className="flex flex-wrap gap-3">
                {[
                    { label: 'Total invoices', value: invoices.length, color: 'text-gray-400' },
                    { label: 'Due from farms', value: `${totalDue.toLocaleString()} ${invoices[0]?.currency || 'EGP'}`, color: 'text-amber-400' },
                    { label: 'Received from farms', value: `${totalPaidUs.toLocaleString()} ${invoices[0]?.currency || 'EGP'}`, color: 'text-green-400' },
                    { label: 'Paid to Uniform Agri (€)', value: `€${totalPaidUniform.toLocaleString()}`, color: 'text-blue-400' },
                ].map(chip => (
                    <div key={chip.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{chip.label}</span>
                        <span className={`font-bold ${chip.color}`}>{chip.value}</span>
                    </div>
                ))}
            </div>

            {/* ── Search ── */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search invoices, farms, notes…"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-green-500 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* ── Table ── */}
            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-500" size={36} /></div>
            ) : (
                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.06]' : 'border-gray-200'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead className={isDark ? 'bg-white/[0.025]' : 'bg-gray-50'}>
                                <tr className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                                    <th className={thClass} onClick={() => handleSort('id')}>
                                        <span className="flex items-center gap-1">Invoice # <SortIcon col="id" /></span>
                                    </th>
                                    <th className={thClass} onClick={() => handleSort('created_at')}>
                                        <span className="flex items-center gap-1">Date <SortIcon col="created_at" /></span>
                                    </th>
                                    <th className={thClass} onClick={() => handleSort('client_name')}>
                                        <span className="flex items-center gap-1">Farm Name <SortIcon col="client_name" /></span>
                                    </th>
                                    <th className={`${thClass}`} onClick={() => handleSort('invoice_type')}>
                                        <span className="flex items-center gap-1">Product / Service <SortIcon col="invoice_type" /></span>
                                    </th>
                                    <th className={thClass} onClick={() => handleSort('cost_total')}>
                                        <span className="flex items-center gap-1">Amount → Uniform <SortIcon col="cost_total" /></span>
                                    </th>
                                    <th className={thClass}>Farm Paid ?</th>
                                    <th className={thClass}>We Paid to Uniform ?</th>
                                    <th className={`${thClass} w-48`}>Notes</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-gray-100'}`}>
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-14 text-center text-gray-400 text-sm">
                                            No invoices found{search ? ` matching "${search}"` : ''}
                                        </td>
                                    </tr>
                                )}
                                {rows.map((inv, idx) => {
                                    // Farm paid status derived from invoice status
                                    const farmPaid = inv.status === 'Paid to Us' || inv.status === 'Paid to Uniform'
                                        ? 'Yes'
                                        : inv.status === 'Due'
                                            ? 'No'
                                            : 'Unknown';

                                    // We paid to uniform — use a dedicated field or derive
                                    const paidToUniform = inv.paid_to_uniform ||
                                        (inv.status === 'Paid to Uniform' ? 'Yes' : 'No');

                                    const isEditingNote = editingNote?.id === inv.id;

                                    return (
                                        <tr
                                            key={inv.id}
                                            className={`group transition-colors duration-100 ${isDark
                                                ? idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.012]'
                                                : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                                } hover:bg-green-500/[0.04]`}
                                        >
                                            {/* Invoice # */}
                                            <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                                {invoiceNumber(inv)}
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                {new Date(inv.created_at).toLocaleDateString('en-GB', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </td>

                                            {/* Farm Name */}
                                            <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-white">
                                                {inv.client_name || `Client #${inv.client}`}
                                            </td>

                                            {/* Product / Service */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${inv.invoice_type?.includes('Renewal')
                                                        ? 'bg-blue-500/10 text-blue-400 dark:text-blue-300'
                                                        : 'bg-purple-500/10 text-purple-400 dark:text-purple-300'
                                                    }`}>
                                                    {productLabel(inv.invoice_type)}
                                                </span>
                                            </td>

                                            {/* Amount → Uniform (cost in EUR) */}
                                            <td className="px-4 py-3 text-sm font-bold whitespace-nowrap text-gray-900 dark:text-gray-100 tabular-nums">
                                                €{parseFloat(inv.cost_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>

                                            {/* Farm Paid? — editable, maps from invoice status */}
                                            <td className="px-4 py-3">
                                                <StatusBadge
                                                    value={farmPaid}
                                                    onChange={(val) => {
                                                        const newStatus = val === 'Yes' ? 'Paid to Us'
                                                            : val === 'Cancelled' ? 'Paid to Uniform'
                                                                : 'Due';
                                                        updateMutation.mutate({ id: inv.id, patch: { status: newStatus } });
                                                    }}
                                                />
                                            </td>

                                            {/* We Paid to Uniform? */}
                                            <td className="px-4 py-3">
                                                <StatusBadge
                                                    value={paidToUniform}
                                                    onChange={(val) => {
                                                        updateMutation.mutate({ id: inv.id, patch: { paid_to_uniform: val } });
                                                    }}
                                                />
                                            </td>

                                            {/* Notes — inline edit */}
                                            <td className="px-4 py-3 max-w-[200px]">
                                                {isEditingNote ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            autoFocus
                                                            value={editingNote.text}
                                                            onChange={e => setEditingNote(n => ({ ...n, text: e.target.value }))}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    updateMutation.mutate({ id: inv.id, patch: { notes: editingNote.text } });
                                                                    setEditingNote(null);
                                                                }
                                                                if (e.key === 'Escape') setEditingNote(null);
                                                            }}
                                                            className={`w-full text-xs rounded-lg px-2 py-1 border outline-none focus:ring-1 focus:ring-green-500 ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                updateMutation.mutate({ id: inv.id, patch: { notes: editingNote.text } });
                                                                setEditingNote(null);
                                                            }}
                                                            className="p-1 text-green-400 hover:text-green-300"
                                                        ><Save size={13} /></button>
                                                        <button onClick={() => setEditingNote(null)} className="p-1 text-gray-400 hover:text-gray-300">
                                                            <X size={13} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => setEditingNote({ id: inv.id, text: inv.notes || '' })}
                                                        className={`flex items-center gap-1.5 text-xs cursor-text group/note min-h-[22px] ${inv.notes ? (isDark ? 'text-gray-300' : 'text-gray-700') : 'text-gray-400'}`}
                                                    >
                                                        {inv.notes ? (
                                                            <span className="truncate">{inv.notes}</span>
                                                        ) : (
                                                            <span className="opacity-0 group-hover/note:opacity-60 flex items-center gap-1 transition-opacity">
                                                                <Plus size={11} /> Add note
                                                            </span>
                                                        )}
                                                        <Edit2 size={11} className="shrink-0 opacity-0 group-hover/note:opacity-50 ml-auto transition-opacity" />
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer row count */}
                    <div className={`px-5 py-3 text-xs border-t flex items-center justify-between ${isDark ? 'border-white/[0.05] text-gray-600' : 'border-gray-100 text-gray-400'}`}>
                        <span>{rows.length} invoice{rows.length !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ''}</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                            Click any status badge to update • Click any note to edit
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// helper used in export
function parseToStatus(status) {
    if (status === 'Paid to Us' || status === 'Paid to Uniform') return 'Yes';
    if (status === 'Due') return 'No';
    return 'Unknown';
}
