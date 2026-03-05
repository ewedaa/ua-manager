import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileText, Plus, Search, Loader2, CheckCircle, AlertCircle,
    Download, Trash2, Edit2, User, DollarSign, X,
    FileDown, Printer, Package, Check, ArrowRight, Building2, Users, TrendingUp, StickyNote,
    RefreshCw, Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StatCard from '../components/StatCard';
import { API_BASE_URL } from '../lib/api';
import QuickAddClientModal from '../components/QuickAddClientModal';

import { fetchInvoices, fetchLivestockTypes, fetchClients } from '../lib/fetchers';

// ──────────────────────────────────────────────
// Invoice Form Modal (Dual Pricing)
// ──────────────────────────────────────────────
const InvoiceModal = ({ isOpen, onClose, clients, livestockTypes, editInvoice = null }) => {
    const queryClient = useQueryClient();
    const { isAdmin } = useAuth();
    const { isDark } = useTheme();

    const [formData, setFormData] = useState({
        client: editInvoice?.client || '',
        invoice_type: editInvoice?.invoice_type || 'Renewal Invoice',
        livestock_ids: editInvoice?.livestock_selection?.map(l => l.id) || [],
        status: editInvoice?.status || 'Due',
        notes: editInvoice?.notes || '',
    });
    const [selectedModuleIds, setSelectedModuleIds] = useState(
        editInvoice?.selected_modules?.map(m => m.id) || []
    );
    const [isDairyLive, setIsDairyLive] = useState(editInvoice?.is_dairylive || false);
    const [currency, setCurrency] = useState(editInvoice?.currency || 'EUR');
    const [exchangeRate, setExchangeRate] = useState(editInvoice?.exchange_rate ? parseFloat(editInvoice.exchange_rate) : null);
    const [rateLoading, setRateLoading] = useState(false);
    const [rateDate, setRateDate] = useState('');
    const [error, setError] = useState('');
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    // Fetch modules
    const { data: modules = [] } = useQuery({
        queryKey: ['subscription-modules'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/subscription-modules/`);
            if (!res.ok) throw new Error('Failed to fetch modules');
            return res.json();
        },
    });

    const activeModules = modules.filter(m => m.is_active).sort((a, b) => {
        const getOrder = (name) => {
            if (name.includes('Base module')) return 0;
            if (name.toLowerCase().includes('dairylive')) {
                const match = name.match(/(\d+)/);
                return 100000 + (match ? parseInt(match[1], 10) : 0);
            }
            if (name.includes('Big farm module')) {
                const match = name.match(/(\d+)/);
                return 200000 + (match ? parseInt(match[1], 10) : 0);
            }
            return 300000;
        };
        return getOrder(a.name) - getOrder(b.name);
    });
    const isRenewal = formData.invoice_type === 'Renewal Invoice';

    // Fetch live EUR→EGP rate
    const fetchRate = useCallback(async () => {
        setRateLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/invoices/live_exchange_rate/`);
            const data = await res.json();
            if (data.rate) {
                setExchangeRate(data.rate);
                setRateDate(data.date);
                if (data.is_fallback) {
                    // Soft warning — don't block usage, just inform
                    setError('__FALLBACK__');
                }
            } else {
                // Still set a default so the invoice maker stays usable
                setExchangeRate(57.5);
                setRateDate('');
                setError('__FALLBACK__');
            }
        } catch {
            setExchangeRate(57.5);
            setRateDate('');
            setError('__FALLBACK__');
        } finally {
            setRateLoading(false);
        }
    }, []);

    // Auto-fetch rate when EGP is selected
    useEffect(() => {
        if (currency === 'EGP' && !exchangeRate) {
            fetchRate();
        }
    }, [currency, exchangeRate, fetchRate]);

    // Price conversion helper
    const toDisplay = (eurAmount) => {
        if (currency === 'EGP' && exchangeRate) {
            return (eurAmount * exchangeRate).toFixed(2);
        }
        return eurAmount.toFixed(2);
    };
    const currSymbol = currency === 'EGP' ? 'EGP' : '€';

    // Per-module price helpers (based on invoice type)
    const getModuleCost = (mod) => {
        const base = parseFloat(isRenewal ? (mod.renewal_our_price || 0) : (mod.purchase_our_price || 0));
        return (!isRenewal && isDairyLive) ? base * 0.5 : base;
    }; const getModuleCustomerPrice = (mod) => {
        const base = parseFloat(isRenewal ? (mod.renewal_customer_price || 0) : (mod.purchase_customer_price || 0));
        return (!isRenewal && isDairyLive) ? base * 0.5 : base;
    };

    // Calculate totals (always in EUR base, convert for display)
    const costTotal = selectedModuleIds.reduce((sum, id) => {
        const mod = modules.find(m => m.id === id);
        return sum + (mod ? getModuleCost(mod) : 0);
    }, 0);

    const customerTotal = selectedModuleIds.reduce((sum, id) => {
        const mod = modules.find(m => m.id === id);
        return sum + (mod ? getModuleCustomerPrice(mod) : 0);
    }, 0);

    const profit = customerTotal - costTotal;

    const toggleModule = (id) => {
        setSelectedModuleIds(prev => {
            const isSelecting = !prev.includes(id);
            if (!isSelecting) return prev.filter(x => x !== id);

            const mod = modules.find(m => m.id === id);
            if (!mod || !mod.name.includes('Big farm module')) return [...prev, id];

            // Helper to parse cow count
            const getCows = (name) => {
                const match = name.match(/(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            };

            const targetCows = getCows(mod.name);
            const lowerTierIds = activeModules
                .filter(m => m.name.includes('Big farm module') && getCows(m.name) < targetCows)
                .map(m => m.id);

            const newSet = new Set([...prev, id, ...lowerTierIds]);
            return Array.from(newSet);
        });
    };

    const mutation = useMutation({
        mutationFn: async (data) => {
            const url = editInvoice
                ? `${API_BASE_URL}/invoices/${editInvoice.id}/`
                : `${API_BASE_URL}/invoices/`;
            const response = await fetch(url, {
                method: editInvoice ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(JSON.stringify(err));
            }
            return response.json();
        },
        onSuccess: async (data) => {
            // Auto-generate and download PDF for new invoices
            if (!editInvoice && data?.id) {
                try {
                    const pdfRes = await fetch(`${API_BASE_URL}/invoices/${data.id}/generate_pdf/`, { method: 'POST' });
                    if (pdfRes.ok) {
                        const pdfData = await pdfRes.json();
                        if (pdfData.pdf_url) {
                            const backendOrigin = new URL(API_BASE_URL).origin;
                            const fullUrl = pdfData.pdf_url.startsWith('http') ? pdfData.pdf_url : `${backendOrigin}${pdfData.pdf_url}`;
                            window.open(fullUrl, '_blank');
                        }
                    }
                } catch (pdfErr) {
                    console.warn('PDF auto-download failed:', pdfErr);
                }
            }
            queryClient.invalidateQueries(['invoices']);
            onClose();
        },
        onError: (err) => {
            setError(err.message);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.client) {
            setError('Please select a client');
            return;
        }
        if (selectedModuleIds.length === 0) {
            setError('Please select at least one module');
            return;
        }
        mutation.mutate({
            ...formData,
            selected_module_ids: selectedModuleIds,
            // Store totals in the selected display currency
            total_amount: parseFloat(toDisplay(customerTotal)).toFixed(2),
            cost_total: parseFloat(toDisplay(costTotal)).toFixed(2),
            customer_total: parseFloat(toDisplay(customerTotal)).toFixed(2),
            is_dairylive: isDairyLive,
            currency,
            exchange_rate: currency === 'EGP' && exchangeRate ? exchangeRate : null,
        });
    };

    const toggleLivestock = (id) => {
        setFormData(prev => ({
            ...prev,
            livestock_ids: prev.livestock_ids.includes(id)
                ? prev.livestock_ids.filter(l => l !== id)
                : [...prev.livestock_ids, id]
        }));
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto ${isDark ? 'bg-gray-900 border border-white/[0.08]' : 'bg-white'}`}>
                <div className={`p-6 border-b flex justify-between items-center sticky top-0 z-10 ${isDark ? 'border-white/[0.06] bg-gray-900/98 backdrop-blur-xl' : 'border-gray-100 bg-white/98 backdrop-blur-xl'}`}>
                    <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                            <FileText size={18} className="text-white" />
                        </div>
                        {editInvoice ? 'Edit Invoice' : 'Create New Invoice'}
                    </h2>
                    <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className={`p-3 rounded-xl text-sm border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                            {error}
                        </div>
                    )}

                    {/* Client Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Client *
                            </label>
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => setShowQuickAdd(true)}
                                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
                                >
                                    <Plus size={12} /> New Farm
                                </button>
                            )}
                        </div>
                        <select
                            value={formData.client}
                            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                            className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'border-white/[0.08] bg-white/[0.04] text-white' : 'border-gray-200 bg-white text-gray-900'} focus:ring-2 focus:ring-green-500 focus:outline-none`}
                            disabled={!isAdmin}
                        >
                            <option value="">Select a client...</option>
                            {clients?.map(client => (
                                <option key={client.id} value={client.id}>
                                    {client.name} - {client.farm_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Invoice Type */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Invoice Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Renewal Invoice', 'Purchase Invoice', 'Purchase Quotation'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => isAdmin && setFormData({ ...formData, invoice_type: type })}
                                    className={`py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${formData.invoice_type === type
                                        ? isDark ? 'bg-green-500/15 border border-green-500/30 text-green-400' : 'bg-green-50 border border-green-500 text-green-700'
                                        : isDark ? 'bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:border-white/[0.15]' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300'
                                        } ${!isAdmin && 'opacity-50 cursor-not-allowed'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Currency Selector */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <Globe size={12} className="inline mr-1.5 -mt-0.5" />
                            Currency
                        </label>
                        <div className="flex gap-2">
                            {[
                                { code: 'EUR', label: 'Euro (€)', icon: '€' },
                                { code: 'EGP', label: 'Egyptian Pound (EGP)', icon: '£' },
                            ].map(c => (
                                <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => isAdmin && setCurrency(c.code)}
                                    className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${currency === c.code
                                        ? isDark ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400' : 'bg-blue-50 border border-blue-500 text-blue-700'
                                        : isDark ? 'bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:border-white/[0.12]' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300'
                                        } ${!isAdmin && 'opacity-50 cursor-not-allowed'}`}
                                >
                                    {c.icon} {c.code}
                                </button>
                            ))}
                        </div>

                        {/* Live Rate Box (only when EGP selected) */}
                        {currency === 'EGP' && (
                            <div className={`mt-2 p-3 rounded-xl ${error === '__FALLBACK__'
                                ? isDark ? 'bg-amber-500/8 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
                                : isDark ? 'bg-blue-500/8 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <Globe size={16} className={error === '__FALLBACK__' ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-blue-400' : 'text-blue-600')} />
                                    <div className="flex-1 min-w-0">
                                        {rateLoading ? (
                                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <Loader2 size={11} className="inline animate-spin mr-1" />Fetching live rate...
                                            </span>
                                        ) : error === '__FALLBACK__' ? (
                                            <span className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                                                ⚠ Live rate unavailable — using estimated <b>1 € = {exchangeRate} EGP</b>
                                            </span>
                                        ) : exchangeRate ? (
                                            <span className={`text-xs font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                                <b>1 € = {exchangeRate} EGP</b>
                                                {rateDate && <span className={`ml-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(as of {rateDate})</span>}
                                            </span>
                                        ) : (
                                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Select EGP to fetch rate</span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchRate}
                                        disabled={rateLoading || !isAdmin}
                                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-blue-400' : 'hover:bg-blue-100 text-blue-600'} disabled:opacity-40`}
                                        title="Refresh rate"
                                    >
                                        <RefreshCw size={13} className={rateLoading ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                                {/* Manual rate override when fallback */}
                                {error === '__FALLBACK__' && !rateLoading && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Enter rate manually:</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="1"
                                            value={exchangeRate || ''}
                                            onChange={e => setExchangeRate(parseFloat(e.target.value) || 0)}
                                            className={`w-24 px-2 py-1 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-amber-400 ${isDark ? 'bg-white/[0.06] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                        />
                                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>EGP / €</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* DairyLive Checkbox (purchase only) */}
                    {!isRenewal && (
                        <div>
                            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isDairyLive
                                ? isDark ? 'bg-sky-500/10 border-sky-500/30' : 'bg-sky-50 border-sky-400'
                                : isDark ? 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                }`}>
                                <div
                                    className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${isDairyLive ? 'bg-sky-500 border-sky-500' : isDark ? 'border-gray-600' : 'border-gray-300'}`}
                                    onClick={() => isAdmin && setIsDairyLive(v => !v)}
                                >
                                    {isDairyLive && <Check size={12} className="text-white" />}
                                </div>
                                <div onClick={() => isAdmin && setIsDairyLive(v => !v)} className="flex-1 select-none">
                                    <span className={`font-bold text-sm ${isDairyLive ? isDark ? 'text-sky-300' : 'text-sky-700' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        DairyLive Customer?
                                    </span>
                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        50% discount applied to customer price
                                    </p>
                                </div>
                                {isDairyLive && (
                                    <span className="text-xs font-bold bg-sky-500 text-white px-2 py-0.5 rounded-full shrink-0">50% OFF</span>
                                )}
                            </label>
                        </div>
                    )}

                    {/* Module Selection */}
                    {activeModules.length > 0 && (
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                <Package size={12} className="inline mr-1.5 -mt-0.5" />
                                Select Modules * <span className={`normal-case ml-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>({isRenewal ? 'Renewal prices' : 'Purchase prices'})</span>
                            </label>
                            <div className="space-y-2">
                                {activeModules.map((mod) => {
                                    const isSelected = selectedModuleIds.includes(mod.id);
                                    const modCost = getModuleCost(mod);
                                    const modCustomer = getModuleCustomerPrice(mod);
                                    return (
                                        <button
                                            key={mod.id}
                                            type="button"
                                            onClick={() => isAdmin && toggleModule(mod.id)}
                                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-sm transition-all duration-200 ${isSelected
                                                ? isDark
                                                    ? 'bg-green-500/10 border-green-500/30 shadow-sm shadow-green-500/5'
                                                    : 'bg-green-50 border-green-400 shadow-sm shadow-green-500/10'
                                                : isDark
                                                    ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                                                    : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                                } ${!isAdmin && 'opacity-50 cursor-not-allowed'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${isSelected
                                                    ? 'bg-green-500 border-green-500'
                                                    : isDark ? 'border-gray-600' : 'border-gray-300'
                                                    }`}>
                                                    {isSelected && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className={`font-semibold ${isSelected ? isDark ? 'text-green-300' : 'text-green-800' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {mod.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right">
                                                    <div className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Cost</div>
                                                    <span className={`text-xs font-semibold tabular-nums ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {toDisplay(modCost)} {currSymbol}
                                                    </span>
                                                </div>
                                                <ArrowRight size={10} className={isDark ? 'text-gray-700' : 'text-gray-300'} />
                                                <div className="text-right">
                                                    <div className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? isDark ? 'text-green-500' : 'text-green-600' : isDark ? 'text-gray-600' : 'text-gray-400'}`}>Customer</div>
                                                    <span className={`text-xs font-bold tabular-nums ${isSelected ? isDark ? 'text-green-400' : 'text-green-700' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {toDisplay(modCustomer)} {currSymbol}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Pricing Summary */}
                    {selectedModuleIds.length > 0 && (
                        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
                            <div className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-white/[0.03] text-gray-500 border-b border-white/[0.06]' : 'bg-gray-50 text-gray-500 border-b border-gray-100'}`}>
                                Invoice Summary — {selectedModuleIds.length} module{selectedModuleIds.length > 1 ? 's' : ''}
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                                            <Building2 size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                                        </div>
                                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Cost to Uniform Agri</span>
                                    </div>
                                    <span className={`text-base font-bold tabular-nums ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                        {toDisplay(costTotal)} {currSymbol}
                                    </span>
                                </div>
                                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                    <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}></div>
                                    <span>+40% markup{!isRenewal && isDairyLive ? ' • 50% DairyLive discount' : ''}</span>
                                    <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}></div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                                            <Users size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                                        </div>
                                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Customer Price</span>
                                    </div>
                                    <span className={`text-base font-bold tabular-nums ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                        {toDisplay(customerTotal)} {currSymbol}
                                    </span>
                                </div>
                                <div className={`mt-1 pt-3 border-t flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm shadow-green-500/20">
                                            <TrendingUp size={14} className="text-white" />
                                        </div>
                                        <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Your Profit</span>
                                    </div>
                                    <span className={`text-lg font-extrabold tabular-nums ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                        +{toDisplay(profit)} {currSymbol}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Livestock Selection */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Livestock Types
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {livestockTypes?.map(type => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => isAdmin && toggleLivestock(type.id)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${formData.livestock_ids.includes(type.id)
                                        ? 'bg-green-500/15 text-green-400 border-2 border-green-500'
                                        : isDark ? 'bg-white/[0.06] text-gray-300 border-2 border-transparent hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                                        } ${!isAdmin && 'opacity-50 cursor-not-allowed'}`}
                                >
                                    {type.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Status
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Due', 'Paid to Us', 'Paid to Uniform'].map(status => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => isAdmin && setFormData({ ...formData, status })}
                                    className={`px-3 py-2 rounded-xl border font-medium text-xs transition-all ${formData.status === status
                                        ? status === 'Due'
                                            ? isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-400 text-amber-700'
                                            : isDark ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-green-50 border-green-500 text-green-700'
                                        : isDark ? 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-white/[0.15]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                        } ${!isAdmin && 'opacity-50 cursor-not-allowed'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <StickyNote size={12} className="inline mr-1.5 -mt-0.5" />
                            Notes (Optional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={2}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm resize-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600' : 'border-gray-200 bg-gray-50/50 placeholder-gray-400'}`}
                            placeholder="Add notes for this invoice..."
                            disabled={!isAdmin}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-2.5 px-4 rounded-xl font-medium border transition-colors ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.08]' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isAdmin || mutation.isPending || selectedModuleIds.length === 0}
                            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-green-500/20"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <CheckCircle size={18} />
                            )}
                            {editInvoice ? 'Update' : 'Create'} Invoice
                        </button>
                    </div>
                </form>
            </div>

            {/* Quick Add Client Modal (stacked above local modal) */}
            {showQuickAdd && (
                <QuickAddClientModal
                    onClose={() => setShowQuickAdd(false)}
                    onCreated={(newClient) => {
                        setFormData(prev => ({ ...prev, client: String(newClient.id) }));
                        setShowQuickAdd(false);
                    }}
                />
            )}
        </div>,
        document.body
    );
};

// ──────────────────────────────────────────────
// Status Badge Component
// ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const statusStyles = {
        'Due': 'bg-red-500/15 text-red-400 border border-red-500/20',
        'Paid to Us': 'bg-green-500/15 text-green-400 border border-green-500/20',
        'Paid to Uniform': 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[status] || 'bg-gray-500/15 text-gray-400 border border-gray-500/20'}`}>
            {status}
        </span>
    );
};

// ──────────────────────────────────────────────
// PDF Button
// ──────────────────────────────────────────────
const InvoicePDFButton = ({ invoice }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const queryClient = useQueryClient();

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/generate_pdf/`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to generate PDF');
            const data = await res.json();
            queryClient.invalidateQueries(['invoices']);
            const backendOrigin = new URL(API_BASE_URL).origin;
            const fullUrl = data.pdf_url.startsWith('http') ? data.pdf_url : `${backendOrigin}${data.pdf_url}`;
            window.open(fullUrl, '_blank');
        } catch (error) {
            console.error(error);
            alert('Failed to generate PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    if (invoice.pdf_file) {
        const backendOrigin = new URL(API_BASE_URL).origin;
        const pdfHref = invoice.pdf_file.startsWith('http') ? invoice.pdf_file : `${backendOrigin}${invoice.pdf_file}`;
        return (
            <a
                href={pdfHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-500 border border-green-500/25 rounded-lg transition-all text-xs font-semibold"
                title="Download PDF"
            >
                <Download size={14} />
                Download
            </a>
        );
    }

    return (
        <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/25 rounded-lg transition-all text-xs font-semibold disabled:opacity-50"
            title="Generate Client PDF"
        >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {isGenerating ? 'Generating...' : 'Client PDF'}
        </button>
    );
};

// ──────────────────────────────────────────────
// Internal PDF Button (with cost breakdown)
// ──────────────────────────────────────────────
const InternalPDFButton = ({ invoice }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/generate_internal_pdf/`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to generate internal PDF');
            const data = await res.json();
            // Build full URL from backend origin
            const backendOrigin = new URL(API_BASE_URL).origin;
            const fullUrl = data.pdf_url.startsWith('http') ? data.pdf_url : `${backendOrigin}${data.pdf_url}`;
            window.open(fullUrl, '_blank');
        } catch (error) {
            console.error(error);
            alert('Failed to generate internal PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 rounded-lg transition-all text-xs font-semibold disabled:opacity-50"
            title="Generate Internal PDF (with cost breakdown)"
        >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {isGenerating ? 'Generating...' : 'Internal'}
        </button>
    );
};

// ──────────────────────────────────────────────
// Main InvoiceMaker Page
// ──────────────────────────────────────────────
export default function InvoiceMaker() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editInvoice, setEditInvoice] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const { isAdmin } = useAuth();
    const { isDark } = useTheme();
    const queryClient = useQueryClient();

    const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: fetchClients });
    const { data: invoices, isLoading, isError } = useQuery({ queryKey: ['invoices'], queryFn: fetchInvoices });
    const { data: livestockTypes } = useQuery({ queryKey: ['livestockTypes'], queryFn: fetchLivestockTypes });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const response = await fetch(`${API_BASE_URL}/invoices/${id}/`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete');
        },
        onSuccess: () => queryClient.invalidateQueries(['invoices']),
    });

    const filteredInvoices = invoices?.filter(invoice => {
        const matchesSearch = invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleEdit = (invoice) => {
        setEditInvoice(invoice);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditInvoice(null);
    };

    // Calculate stats
    const totalCost = invoices?.reduce((s, i) => s + parseFloat(i.cost_total || 0), 0) || 0;
    const totalCustomer = invoices?.reduce((s, i) => s + parseFloat(i.customer_total || 0), 0) || 0;
    const totalProfit = totalCustomer - totalCost;
    const dueCount = invoices?.filter(i => i.status === 'Due').length || 0;

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
            'Date': new Date(inv.created_at).toLocaleDateString()
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invoices");
        XLSX.writeFile(wb, "invoices_list.xlsx");
    };

    const handlePrint = () => window.print();

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
                    <button onClick={handlePrint} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
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
                <StatCard
                    icon={FileText}
                    label="Total Invoices"
                    value={invoices?.length || 0}
                    color="blue"
                />
                <StatCard
                    icon={AlertCircle}
                    label="Due Invoices"
                    value={dueCount}
                    color="red"
                />
                <StatCard
                    icon={DollarSign}
                    label="Total Customer Revenue"
                    value={`${totalCustomer.toLocaleString()} €`}
                    color="purple"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Total Profit"
                    value={`${totalProfit.toLocaleString()} €`}
                    color="green"
                />
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
                                    <span className="flex items-center justify-end gap-1">
                                        <Building2 size={12} /> Cost (UA)
                                    </span>
                                </th>
                                <th className="text-right px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <span className="flex items-center justify-end gap-1">
                                        <Users size={12} /> Customer
                                    </span>
                                </th>
                                <th className="text-right px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <span className="flex items-center justify-end gap-1">
                                        <TrendingUp size={12} /> Profit
                                    </span>
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

            {/* Modal */}
            <InvoiceModal
                key={editInvoice?.id || 'create'}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                clients={clients}
                livestockTypes={livestockTypes}
                editInvoice={editInvoice}
            />
        </div>
    );
}
