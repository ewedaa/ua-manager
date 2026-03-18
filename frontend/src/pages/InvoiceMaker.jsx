import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileText, Plus, Search, Loader2, AlertCircle,
    Download, Trash2, Edit2, User, DollarSign,
    FileDown, Printer, Building2, Users, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import InvoiceModal from '../components/InvoiceModal';
import { InvoicePDFButton, InternalPDFButton } from '../components/InvoicePDFActions';
import { API_BASE_URL } from '../lib/api';
import { fetchInvoices, fetchLivestockTypes, fetchClients } from '../lib/fetchers';

export default function InvoiceMaker() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const { isDark } = useTheme();
    const queryClient = useQueryClient();

    const [isModalOpen, setIsModalOpen] = useState(location.state?.openNewInvoice || false);
    const [preselectedClientId, setPreselectedClientId] = useState(location.state?.preselectedClientId || null);
    const [editInvoice, setEditInvoice] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Clear router state so modal doesn't re-open on nav back
    useEffect(() => {
        if (location.state?.openNewInvoice) {
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    // ── Data ──────────────────────────────────────────────────────
    const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: fetchClients });
    const { data: invoices, isLoading, isError } = useQuery({ queryKey: ['invoices'], queryFn: fetchInvoices });
    const { data: livestockTypes } = useQuery({ queryKey: ['livestockTypes'], queryFn: fetchLivestockTypes });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`${API_BASE_URL}/invoices/${id}/`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
        },
        onSuccess: () => queryClient.invalidateQueries(['invoices']),
    });

    // Open edit modal when navigated to with editInvoiceId state
    useEffect(() => {
        if (location.state?.editInvoiceId && invoices) {
            const invToEdit = invoices.find(i => i.id === location.state.editInvoiceId);
            if (invToEdit) {
                setEditInvoice(invToEdit);
                setIsModalOpen(true);
            }
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state?.editInvoiceId, invoices, navigate, location.pathname]);

    // ── Filtering ─────────────────────────────────────────────────
    const filteredInvoices = invoices?.filter(inv => {
        const matchesSearch = inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
        const isQuotation = inv.invoice_type?.toLowerCase().includes('quotation');
        return matchesSearch && matchesStatus && !isQuotation;
    });

    // ── Stats (exclude quotations) ────────────────────────────────
    const financialInvoices = invoices?.filter(i => !i.invoice_type?.toLowerCase().includes('quotation')) || [];
    const totalCost = financialInvoices.reduce((s, i) => s + parseFloat(i.cost_total || 0), 0);
    const totalCustomer = financialInvoices.reduce((s, i) => s + parseFloat(i.customer_total || 0), 0);
    const totalProfit = totalCustomer - totalCost;
    const dueCount = financialInvoices.filter(i => i.status === 'Due').length;

    // ── Handlers ──────────────────────────────────────────────────
    const handleEdit = (invoice) => { setEditInvoice(invoice); setIsModalOpen(true); };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditInvoice(null);
        setPreselectedClientId(null);
    };

    const handleExport = async () => {
        if (!filteredInvoices) return;
        const XLSX = await import('xlsx');
        const data = filteredInvoices.map(inv => ({
            'Invoice ID': `#${inv.id}`,
            'Client': inv.client_name,
            'Type': inv.invoice_type,
            'Cost (UA)': parseFloat(inv.cost_total || 0),
            'Customer Price': parseFloat(inv.customer_total || 0),
            'Profit': parseFloat(inv.customer_total || 0) - parseFloat(inv.cost_total || 0),
            'Status': inv.status,
            'Date': new Date(inv.created_at).toLocaleDateString(),
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
        XLSX.writeFile(wb, 'invoices_list.xlsx');
    };

    // ── Loading / error states ────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <Loader2 className="w-12 h-12 animate-spin text-green-500" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-500">Error Loading Invoices</h3>
            </div>
        );
    }

    return (
        <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4 space-y-5 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-6 pt-2">
                <div>
                    <h1 className={`text-3xl font-extrabold tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <FileText className="text-green-500" />
                        Invoice Maker
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Create and manage client invoices with dual pricing
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handleExport} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <FileDown size={18} /> Export
                    </button>
                    <button onClick={() => window.print()} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <Printer size={18} /> Print
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:shadow-green-500/20 hover:scale-105"
                        >
                            <Plus size={20} />
                            New Invoice
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by client name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'} focus:ring-2 focus:ring-green-500 outline-none`}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200'} focus:ring-2 focus:ring-green-500 outline-none`}
                >
                    <option value="all">All Status</option>
                    <option value="Due">Due</option>
                    <option value="Paid to Us">Paid to Us</option>
                    <option value="Paid to Uniform">Paid to Uniform</option>
                </select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={FileText} label="Total Invoices" value={financialInvoices.length} color="blue" />
                <StatCard icon={AlertCircle} label="Due Invoices" value={dueCount} color="red" />
                <StatCard icon={DollarSign} label="Total Customer Revenue" value={`${totalCustomer.toLocaleString()} €`} color="purple" />
                <StatCard icon={TrendingUp} label="Total Profit" value={`${totalProfit.toLocaleString()} €`} color="green" />
            </div>

            {/* Invoices Table */}
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-100'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}>
                                <th className="text-left px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="text-left px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                <th className="text-left px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="text-right px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <span className="flex items-center justify-end gap-1"><Building2 size={12} /> Cost (UA)</span>
                                </th>
                                <th className="text-right px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <span className="flex items-center justify-end gap-1"><Users size={12} /> Customer</span>
                                </th>
                                <th className="text-right px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <span className="flex items-center justify-end gap-1"><TrendingUp size={12} /> Profit</span>
                                </th>
                                <th className="text-left px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="text-left px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="text-left px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                            {filteredInvoices?.length > 0 ? (
                                filteredInvoices.map((invoice, index) => {
                                    const cost = parseFloat(invoice.cost_total || 0);
                                    const customer = parseFloat(invoice.customer_total || 0);
                                    const invoiceProfit = customer - cost;
                                    return (
                                        <tr
                                            key={invoice.id}
                                            className={`transition-all duration-300 animate-in slide-in-from-bottom-2 ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'}`}
                                            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                                        >
                                            <td className="px-5 py-4">
                                                <span className="font-medium text-gray-900 dark:text-gray-200">#{invoice.id}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User size={16} className="text-gray-400" />
                                                    <span className="text-gray-900 dark:text-gray-200">{invoice.client_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`px-2 py-1 rounded text-sm ${isDark ? 'bg-white/[0.06] text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                    {invoice.invoice_type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className={`font-semibold tabular-nums text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    {cost > 0 ? cost.toLocaleString() : '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className={`font-semibold tabular-nums text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                                    {customer > 0 ? customer.toLocaleString() : parseFloat(invoice.total_amount).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className={`font-bold tabular-nums text-sm ${invoiceProfit > 0 ? isDark ? 'text-green-400' : 'text-green-600' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {invoiceProfit > 0 ? `+${invoiceProfit.toLocaleString()}` : '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={invoice.status} />
                                            </td>
                                            <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                                {new Date(invoice.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <InvoicePDFButton invoice={invoice} />
                                                    {isAdmin && <InternalPDFButton invoice={invoice} />}
                                                    {isAdmin && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEdit(invoice)}
                                                                className="p-2 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm('Are you sure you want to delete this invoice?')) {
                                                                        deleteMutation.mutate(invoice.id);
                                                                    }
                                                                }}
                                                                className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                                        No invoices found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoice create / edit modal */}
            <InvoiceModal
                key={editInvoice?.id || 'create'}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                clients={clients}
                livestockTypes={livestockTypes}
                editInvoice={editInvoice}
                preselectedClientId={preselectedClientId}
            />
        </div>
    );
}
