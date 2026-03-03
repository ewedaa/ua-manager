import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, CreditCard, ArrowDownLeft, ArrowUpRight, DollarSign, FileDown, Printer } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import StatCard from '../components/StatCard';
import { API_BASE_URL } from '../lib/api';

const API = API_BASE_URL;

export default function PaymentTracker() {
    const { isDark } = useTheme();
    const [search, setSearch] = useState('');
    const [directionFilter, setDirectionFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const { data: invoices = [], isLoading } = useQuery({
        queryKey: ['invoices'],
        queryFn: () => fetch(`${API}/invoices/`).then(r => r.json()),
    });

    // Extract all payments from invoices
    const allPayments = invoices.flatMap(inv =>
        (inv.payments || []).map(p => ({
            ...p,
            invoiceId: inv.id,
            clientName: inv.client_name,
            invoiceType: inv.invoice_type,
            invoiceTotal: inv.total_amount,
        }))
    );

    const filtered = allPayments.filter(p => {
        const matchSearch = !search || p.clientName?.toLowerCase().includes(search.toLowerCase());
        const matchDir = !directionFilter || p.direction === directionFilter;
        const matchDateFrom = !dateFrom || (p.date && p.date >= dateFrom);
        const matchDateTo = !dateTo || (p.date && p.date <= dateTo);
        return matchSearch && matchDir && matchDateFrom && matchDateTo;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalInbound = allPayments.filter(p => p.direction === 'Inbound').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const totalOutbound = allPayments.filter(p => p.direction === 'Outbound').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const balance = totalInbound - totalOutbound;

    return (
        <div className="px-4 pb-4 pt-1 md:px-6 md:pb-6 md:pt-3 space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                    <CreditCard className="text-green-500" size={28} />
                    Payment Tracker
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Track all payments across invoices</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button onClick={async () => {
                    if (!filtered.length) return;
                    const XLSX = await import('xlsx');
                    const data = filtered.map(p => ({
                        'Date': p.date,
                        'Client': p.clientName,
                        'Invoice Type': p.invoiceType,
                        'Direction': p.direction,
                        'Amount': parseFloat(p.amount)
                    }));
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Payments");
                    XLSX.writeFile(wb, "payments_list.xlsx");
                }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <FileDown size={18} /> Export
                </button>
                <button onClick={() => window.print()} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Printer size={18} /> Print
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    icon={ArrowDownLeft}
                    label="Total Inbound"
                    value={`${totalInbound.toLocaleString()} EGP`}
                    color="green"
                />
                <StatCard
                    icon={ArrowUpRight}
                    label="Total Outbound"
                    value={`${totalOutbound.toLocaleString()} EGP`}
                    color="red"
                />
                <StatCard
                    icon={DollarSign}
                    label="Net Balance"
                    value={`${balance.toLocaleString()} EGP`}
                    color={balance >= 0 ? 'blue' : 'red'}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by client..." className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'} focus:ring-2 focus:ring-green-500 outline-none`} />
                </div>
                <select value={directionFilter} onChange={e => setDirectionFilter(e.target.value)} className={`px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200'} outline-none`}>
                    <option value="">All Directions</option>
                    <option value="Inbound">Inbound</option>
                    <option value="Outbound">Outbound</option>
                </select>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>From:</span>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`px-3 py-2 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200'} outline-none text-sm`} />
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>To:</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`px-3 py-2 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200'} outline-none text-sm`} />
                </div>
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
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Type</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                                {filtered.map(p => (
                                    <tr key={p.id} className={`transition-colors duration-100 ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'}`}>
                                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">{p.date}</td>
                                        <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-200">{p.clientName}</td>
                                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">{p.invoiceType}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${p.direction === 'Inbound'
                                                ? 'bg-green-500/15 text-green-400 border-green-500/20'
                                                : 'bg-red-500/15 text-red-400 border-red-500/20'
                                                }`}>
                                                {p.direction === 'Inbound' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                                {p.direction}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm font-semibold text-right text-gray-900 dark:text-gray-200">{parseFloat(p.amount).toLocaleString()} EGP</td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">No payments found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
