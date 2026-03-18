import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileText, Plus, Loader2, X,
    Package, Check, ArrowRight, Building2, Users, TrendingUp,
    StickyNote, DollarSign, CheckCircle, Globe, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';
import { fetchSubscriptionModules } from '../lib/fetchers';
import { sortModules, toggleModuleWithCascade, fetchLiveExchangeRate, autoOpenInvoicePDF } from '../lib/invoiceUtils';
import QuickAddClientModal from './QuickAddClientModal';

/**
 * Modal used by InvoiceMaker to create or edit an invoice with dual-currency pricing.
 */
export default function InvoiceModal({
    isOpen,
    onClose,
    clients,
    livestockTypes,
    editInvoice = null,
    preselectedClientId = null,
}) {
    const queryClient = useQueryClient();
    const { isAdmin } = useAuth();
    const { isDark } = useTheme();

    // ── Form state ────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        client: editInvoice?.client || preselectedClientId || '',
        invoice_type: editInvoice?.invoice_type || 'Renewal Invoice',
        livestock_ids: editInvoice?.livestock_selection?.map(l => l.id) || [],
        notes: editInvoice?.notes || '',
    });
    const [newFarmName, setNewFarmName] = useState('');
    const [selectedModuleIds, setSelectedModuleIds] = useState(
        editInvoice?.selected_modules?.map(m => m.id) || []
    );
    const [isDairyLive, setIsDairyLive] = useState(editInvoice?.is_dairylive || false);
    const [currency, setCurrency] = useState(editInvoice?.currency || 'EUR');
    const [exchangeRate, setExchangeRate] = useState(
        editInvoice?.exchange_rate ? parseFloat(editInvoice.exchange_rate) : null
    );
    const [includeVat, setIncludeVat] = useState(editInvoice?.include_vat || false);
    const [rateLoading, setRateLoading] = useState(false);
    const [rateDate, setRateDate] = useState('');
    const [error, setError] = useState('');
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [lastAutofilledClient, setLastAutofilledClient] = useState(null);

    // Reset autofill tracking when modal closes
    useEffect(() => {
        if (!isOpen) setLastAutofilledClient(null);
    }, [isOpen]);

    // ── Data fetching ─────────────────────────────────────────────
    const { data: modules = [] } = useQuery({
        queryKey: ['subscription-modules'],
        queryFn: fetchSubscriptionModules,
    });

    // Auto-populate modules from client's subscription when a client is selected
    useEffect(() => {
        if (isOpen && !editInvoice && formData.client && modules.length > 0 && formData.client !== lastAutofilledClient) {
            const selectedClient = clients?.find(c => c.id.toString() === formData.client.toString());
            if (selectedClient?.subscription_modules) {
                const clientModuleNames = selectedClient.subscription_modules.split(',').map(s => s.trim());
                const matchingIds = modules.filter(m => clientModuleNames.includes(m.name)).map(m => m.id);
                setSelectedModuleIds(matchingIds);
            } else {
                setSelectedModuleIds([]);
            }
            setLastAutofilledClient(formData.client);
        }
    }, [isOpen, editInvoice, formData.client, modules, clients, lastAutofilledClient]);

    const activeModules = sortModules(modules.filter(m => m.is_active));
    const isRenewal = formData.invoice_type === 'Renewal Invoice';

    // ── Exchange rate ─────────────────────────────────────────────
    const fetchRate = useCallback(async () => {
        setRateLoading(true);
        setError('');
        try {
            const data = await fetchLiveExchangeRate();
            if (data.rate) {
                setExchangeRate(data.rate);
                setRateDate(data.date);
                if (data.is_fallback) setError('__FALLBACK__');
            } else {
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

    useEffect(() => {
        if (currency === 'EGP' && !exchangeRate) fetchRate();
    }, [currency, exchangeRate, fetchRate]);

    // ── Price helpers ─────────────────────────────────────────────
    const toDisplay = (eurAmount) =>
        (currency === 'EGP' && exchangeRate ? eurAmount * exchangeRate : eurAmount).toFixed(2);

    const currSymbol = currency === 'EGP' ? 'EGP' : '€';

    const getModuleCost = (mod) => {
        const base = parseFloat(isRenewal ? (mod.renewal_our_price || 0) : (mod.purchase_our_price || 0));
        return !isRenewal && isDairyLive ? base * 0.5 : base;
    };

    const getModuleCustomerPrice = (mod) => {
        const base = parseFloat(isRenewal ? (mod.renewal_customer_price || 0) : (mod.purchase_customer_price || 0));
        return !isRenewal && isDairyLive ? base * 0.5 : base;
    };

    const costTotal = selectedModuleIds.reduce((sum, id) => {
        const mod = modules.find(m => m.id === id);
        return sum + (mod ? getModuleCost(mod) : 0);
    }, 0);

    const customerTotal = selectedModuleIds.reduce((sum, id) => {
        const mod = modules.find(m => m.id === id);
        return sum + (mod ? getModuleCustomerPrice(mod) : 0);
    }, 0);

    const profit = customerTotal - costTotal;

    const toggleModule = (id) =>
        setSelectedModuleIds(prev =>
            toggleModuleWithCascade(prev, id, modules, activeModules)
        );

    const toggleLivestock = (id) =>
        setFormData(prev => ({
            ...prev,
            livestock_ids: prev.livestock_ids.includes(id)
                ? prev.livestock_ids.filter(l => l !== id)
                : [...prev.livestock_ids, id],
        }));

    // ── Submission ────────────────────────────────────────────────
    const mutation = useMutation({
        mutationFn: async (data) => {
            const url = editInvoice
                ? `${API_BASE_URL}/invoices/${editInvoice.id}/`
                : `${API_BASE_URL}/invoices/`;
            const res = await fetch(url, {
                method: editInvoice ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(JSON.stringify(err));
            }
            return res.json();
        },
        onSuccess: async (data) => {
            if (!editInvoice && data?.id) {
                await autoOpenInvoicePDF(data.id);
            }
            queryClient.invalidateQueries(['invoices']);
            onClose();
        },
        onError: (err) => setError(err.message),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.client && !newFarmName) {
            setError('Please select a client or enter a farm name');
            return;
        }
        if (selectedModuleIds.length === 0) {
            setError('Please select at least one module');
            return;
        }
        mutation.mutate({
            ...formData,
            client: formData.client || null,
            selected_module_ids: selectedModuleIds,
            new_farm_name: formData.invoice_type === 'Purchase Quotation' ? newFarmName : null,
            total_amount: parseFloat(toDisplay(customerTotal)).toFixed(2),
            cost_total: parseFloat(toDisplay(costTotal)).toFixed(2),
            customer_total: parseFloat(toDisplay(customerTotal)).toFixed(2),
            is_dairylive: isDairyLive,
            include_vat: includeVat,
            currency,
            exchange_rate: currency === 'EGP' && exchangeRate ? exchangeRate : null,
        });
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto ${isDark ? 'bg-gray-900 border border-white/[0.08]' : 'bg-white'}`}>

                {/* Header */}
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
                    {/* Error */}
                    {error && error !== '__FALLBACK__' && (
                        <div className={`p-3 rounded-xl text-sm border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                            {error}
                        </div>
                    )}

                    {/* Invoice Type */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Invoice Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
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

                    {/* Client Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {formData.invoice_type === 'Purchase Quotation' ? 'Client / New Farm Name *' : 'Client *'}
                            </label>
                            {isAdmin && formData.invoice_type !== 'Purchase Quotation' && (
                                <button
                                    type="button"
                                    onClick={() => setShowQuickAdd(true)}
                                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
                                >
                                    <Plus size={12} /> New Farm
                                </button>
                            )}
                        </div>

                        {formData.invoice_type === 'Purchase Quotation' ? (
                            <div className="space-y-3">
                                <select
                                    value={formData.client}
                                    onChange={(e) => {
                                        setFormData({ ...formData, client: e.target.value });
                                        if (e.target.value) setNewFarmName('');
                                    }}
                                    className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'border-white/[0.08] bg-white/[0.04] text-white' : 'border-gray-200 bg-white text-gray-900'} focus:ring-2 focus:ring-green-500 focus:outline-none`}
                                    disabled={!isAdmin}
                                >
                                    <option value="">Select existing client (Optional)...</option>
                                    {clients?.map(client => (
                                        <option key={client.id} value={client.id}>{client.name} - {client.farm_name}</option>
                                    ))}
                                </select>
                                {!formData.client && (
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Building2 size={14} className={isDark ? 'text-gray-600' : 'text-gray-400'} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Or enter new farm name..."
                                            value={newFarmName}
                                            onChange={(e) => setNewFarmName(e.target.value)}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${isDark ? 'border-white/[0.08] bg-white/[0.04] text-white placeholder-gray-600' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'} focus:ring-2 focus:ring-green-500 focus:outline-none`}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <select
                                value={formData.client}
                                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                                className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'border-white/[0.08] bg-white/[0.04] text-white' : 'border-gray-200 bg-white text-gray-900'} focus:ring-2 focus:ring-green-500 focus:outline-none`}
                                disabled={!isAdmin}
                            >
                                <option value="">Select a client...</option>
                                {clients?.map(client => (
                                    <option key={client.id} value={client.id}>{client.name} - {client.farm_name}</option>
                                ))}
                            </select>
                        )}
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

                        {/* Live rate box */}
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

                    {/* DairyLive toggle (purchase only) */}
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
                                {isDairyLive && <span className="text-xs font-bold bg-sky-500 text-white px-2 py-0.5 rounded-full shrink-0">50% OFF</span>}
                            </label>
                        </div>
                    )}

                    {/* VAT toggle */}
                    <div>
                        <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${includeVat
                            ? isDark ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-400'
                            : isDark ? 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            }`}>
                            <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${includeVat ? 'bg-indigo-500 border-indigo-500' : isDark ? 'border-gray-600' : 'border-gray-300'}`}
                                onClick={() => isAdmin && setIncludeVat(v => !v)}
                            >
                                {includeVat && <Check size={12} className="text-white" />}
                            </div>
                            <div onClick={() => isAdmin && setIncludeVat(v => !v)} className="flex-1 select-none">
                                <span className={`font-bold text-sm ${includeVat ? isDark ? 'text-indigo-300' : 'text-indigo-700' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Add 14% Value Added Tax (VAT)
                                </span>
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Adds a 14% tax to the final total
                                </p>
                            </div>
                            {includeVat && <span className="text-xs font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full shrink-0">+14% VAT</span>}
                        </label>
                    </div>

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
                                    return (
                                        <button
                                            key={mod.id}
                                            type="button"
                                            onClick={() => isAdmin && toggleModule(mod.id)}
                                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-sm transition-all duration-200 ${isSelected
                                                ? isDark ? 'bg-green-500/10 border-green-500/30 shadow-sm shadow-green-500/5' : 'bg-green-50 border-green-400 shadow-sm shadow-green-500/10'
                                                : isDark ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]' : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                                } ${!isAdmin && 'opacity-50 cursor-not-allowed'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-green-500 border-green-500' : isDark ? 'border-gray-600' : 'border-gray-300'}`}>
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
                                                        {toDisplay(getModuleCost(mod))} {currSymbol}
                                                    </span>
                                                </div>
                                                <ArrowRight size={10} className={isDark ? 'text-gray-700' : 'text-gray-300'} />
                                                <div className="text-right">
                                                    <div className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? isDark ? 'text-green-500' : 'text-green-600' : isDark ? 'text-gray-600' : 'text-gray-400'}`}>Customer</div>
                                                    <span className={`text-xs font-bold tabular-nums ${isSelected ? isDark ? 'text-green-400' : 'text-green-700' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {toDisplay(getModuleCustomerPrice(mod))} {currSymbol}
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
                                <SummaryRow icon={<Building2 size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />} iconBg={isDark ? 'bg-blue-500/10' : 'bg-blue-50'} label="Cost to Uniform Agri" value={`${toDisplay(costTotal)} ${currSymbol}`} valueColor={isDark ? 'text-blue-400' : 'text-blue-600'} isDark={isDark} />
                                <Divider label={`+40% markup${!isRenewal && isDairyLive ? ' • 50% DairyLive discount' : ''}`} isDark={isDark} />
                                <SummaryRow icon={<Users size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />} iconBg={isDark ? 'bg-amber-500/10' : 'bg-amber-50'} label="Customer Price" value={`${toDisplay(customerTotal)} ${currSymbol}`} valueColor={isDark ? 'text-amber-400' : 'text-amber-600'} isDark={isDark} />
                                {includeVat && (
                                    <>
                                        <Divider label="+14% VAT" isDark={isDark} />
                                        <SummaryRow icon={<DollarSign size={14} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />} iconBg={isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'} label="VAT Amount" value={`${toDisplay(customerTotal * 0.14)} ${currSymbol}`} valueColor={isDark ? 'text-indigo-400' : 'text-indigo-600'} isDark={isDark} />
                                        <div className="flex items-center justify-between pt-2">
                                            <span className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Grand Total</span>
                                            <span className={`text-lg font-bold tabular-nums ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                {toDisplay(customerTotal * 1.14)} {currSymbol}
                                            </span>
                                        </div>
                                    </>
                                )}
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

                    {/* Status (hidden for quotations) */}
                    {formData.invoice_type !== 'Purchase Quotation' && (
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
                    )}

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
                            {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                            {editInvoice ? 'Update' : 'Create'} Invoice
                        </button>
                    </div>
                </form>
            </div>

            {/* Stacked Quick-Add client modal */}
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
}

// ── Local helper sub-components ──────────────────────────────────────────────

function SummaryRow({ icon, iconBg, label, value, valueColor, isDark }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
            </div>
            <span className={`text-base font-bold tabular-nums ${valueColor}`}>{value}</span>
        </div>
    );
}

function Divider({ label, isDark }) {
    return (
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`} />
            <span>{label}</span>
            <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`} />
        </div>
    );
}
