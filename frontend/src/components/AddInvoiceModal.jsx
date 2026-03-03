import React, { useState, useRef } from 'react';
import { X, Save, Loader2, AlertCircle, Upload, FileText, Plus, Package, Check, TrendingUp, ArrowRight, DollarSign, Building2, Users, StickyNote, Receipt, ShoppingCart, RefreshCw, Sparkles, ChevronRight, CheckCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

export default function AddInvoiceModal({ clientId, clientName, onClose }) {
    const queryClient = useQueryClient();
    const { isDark } = useTheme();
    const fileInputRef = useRef(null);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        client: clientId,
        invoice_type: 'Renewal Invoice',
        status: 'Due',
        notes: '',
    });
    const [selectedModuleIds, setSelectedModuleIds] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch available modules with prices
    const { data: modules = [] } = useQuery({
        queryKey: ['subscription-modules'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/subscription-modules/`);
            if (!res.ok) throw new Error('Failed to fetch modules');
            return res.json();
        },
    });

    const activeModules = modules.filter(m => m.is_active);

    // Calculate totals from selected modules
    const costTotal = selectedModuleIds.reduce((sum, id) => {
        const mod = modules.find(m => m.id === id);
        return sum + (mod ? parseFloat(mod.price || 0) : 0);
    }, 0);

    const customerTotal = selectedModuleIds.reduce((sum, id) => {
        const mod = modules.find(m => m.id === id);
        return sum + (mod ? parseFloat(mod.customer_price || 0) : 0);
    }, 0);

    const profit = customerTotal - costTotal;

    const toggleModule = (id) => {
        setSelectedModuleIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAllModules = () => {
        if (selectedModuleIds.length === activeModules.length) {
            setSelectedModuleIds([]);
        } else {
            setSelectedModuleIds(activeModules.map(m => m.id));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
        } else {
            setError('Please select a PDF file');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        if (selectedModuleIds.length === 0) {
            setError('Please select at least one module');
            setIsSubmitting(false);
            return;
        }

        try {
            const form = new FormData();
            form.append('client', clientId);
            form.append('total_amount', customerTotal.toFixed(2));
            form.append('cost_total', costTotal.toFixed(2));
            form.append('customer_total', customerTotal.toFixed(2));
            form.append('invoice_type', formData.invoice_type);
            form.append('status', formData.status);
            form.append('notes', formData.notes);
            if (selectedFile) {
                form.append('pdf_file', selectedFile);
            }
            selectedModuleIds.forEach(id => form.append('selected_module_ids', id));

            const response = await fetch(`${API_BASE_URL}/invoices/`, {
                method: 'POST',
                body: form,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(JSON.stringify(data));
            }

            const invoice = await response.json();

            // Auto-generate and download PDF
            try {
                const pdfRes = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/generate_pdf/`, { method: 'POST' });
                if (pdfRes.ok) {
                    const pdfData = await pdfRes.json();
                    if (pdfData.pdf_url) {
                        window.open(pdfData.pdf_url, '_blank');
                    }
                }
            } catch (pdfErr) {
                console.warn('PDF auto-download failed:', pdfErr);
            }

            queryClient.invalidateQueries(['clients']);
            queryClient.invalidateQueries(['invoices']);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const invoiceTypes = [
        { value: 'Renewal Invoice', label: 'Renewal', icon: RefreshCw, desc: 'Subscription renewal', gradient: 'from-blue-500 to-cyan-500', bg: isDark ? 'bg-blue-500/8' : 'bg-blue-50/80', border: isDark ? 'border-blue-500/25' : 'border-blue-200', text: isDark ? 'text-blue-400' : 'text-blue-700' },
        { value: 'Purchase Invoice', label: 'Purchase', icon: ShoppingCart, desc: 'Product purchase', gradient: 'from-violet-500 to-purple-500', bg: isDark ? 'bg-violet-500/8' : 'bg-violet-50/80', border: isDark ? 'border-violet-500/25' : 'border-violet-200', text: isDark ? 'text-violet-400' : 'text-violet-700' },
        { value: 'Purchase Quotation', label: 'Quotation', icon: FileText, desc: 'Price estimate', gradient: 'from-amber-500 to-orange-500', bg: isDark ? 'bg-amber-500/8' : 'bg-amber-50/80', border: isDark ? 'border-amber-500/25' : 'border-amber-200', text: isDark ? 'text-amber-400' : 'text-amber-700' },
    ];

    const statusOptions = [
        { value: 'Due', label: 'Due', color: isDark ? 'text-amber-400' : 'text-amber-700', bg: isDark ? 'bg-amber-500/12 border-amber-500/25' : 'bg-amber-50 border-amber-300', dot: 'bg-amber-500' },
        { value: 'Paid to Us', label: 'Paid to Us', color: isDark ? 'text-green-400' : 'text-green-700', bg: isDark ? 'bg-green-500/12 border-green-500/25' : 'bg-green-50 border-green-300', dot: 'bg-green-500' },
        { value: 'Paid to Uniform', label: 'Paid to Uniform', color: isDark ? 'text-blue-400' : 'text-blue-700', bg: isDark ? 'bg-blue-500/12 border-blue-500/25' : 'bg-blue-50 border-blue-300', dot: 'bg-blue-500' },
    ];

    const currentType = invoiceTypes.find(t => t.value === formData.invoice_type);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] pb-4 px-4 z-50 animate-in fade-in duration-200">
            <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col ${isDark ? 'bg-gray-900/95 backdrop-blur-xl border border-white/[0.08]' : 'bg-white'}`}>

                {/* ═══ HEADER ═══ */}
                <div className={`relative p-5 border-b flex justify-between items-center shrink-0 ${isDark ? 'border-white/[0.06] bg-gray-900' : 'border-gray-100 bg-white'}`}>
                    {/* Gradient accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${currentType?.gradient || 'from-green-500 to-emerald-500'}`} />

                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentType?.gradient || 'from-green-500 to-emerald-600'} flex items-center justify-center shadow-lg`}>
                            {currentType ? <currentType.icon size={18} className="text-white" /> : <FileText size={18} className="text-white" />}
                        </div>
                        <div>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {formData.invoice_type === 'Purchase Quotation' ? 'Price Quotation' : 'Create Invoice'}
                            </h2>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                for <span className="font-semibold">{clientName}</span>
                            </p>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 mr-3">
                            {[1, 2, 3].map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => s < step && setStep(s)}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${s === step
                                        ? `w-6 bg-gradient-to-r ${currentType?.gradient || 'from-green-500 to-emerald-500'}`
                                        : s < step
                                            ? isDark ? 'bg-green-500/50' : 'bg-green-400'
                                            : isDark ? 'bg-white/10' : 'bg-gray-200'
                                        }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={onClose}
                            className={`transition-colors p-1.5 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ═══ BODY ═══ */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-5 space-y-5">

                        {error && (
                            <div className={`rounded-xl p-3 flex items-start gap-2.5 border text-sm animate-in slide-in-from-top-2 duration-200 ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                                <AlertCircle className={`flex-shrink-0 mt-0.5 ${isDark ? 'text-red-400' : 'text-red-500'}`} size={16} />
                                <p className={isDark ? 'text-red-400' : 'text-red-700'}>{error}</p>
                            </div>
                        )}

                        {/* ═══ STEP 1: TYPE & STATUS ═══ */}
                        {step === 1 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Invoice Type Cards */}
                                <div>
                                    <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Document Type
                                    </label>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {invoiceTypes.map((type) => {
                                            const isActive = formData.invoice_type === type.value;
                                            return (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, invoice_type: type.value })}
                                                    className={`relative p-3.5 rounded-xl border-2 transition-all duration-300 text-center group overflow-hidden ${isActive
                                                        ? `${type.bg} ${type.border} shadow-sm`
                                                        : isDark
                                                            ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                                                            : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 hover:bg-gray-100/50'
                                                        }`}
                                                >
                                                    {isActive && (
                                                        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${type.gradient}`} />
                                                    )}
                                                    <div className={`w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center transition-all duration-300 ${isActive
                                                        ? `bg-gradient-to-br ${type.gradient} shadow-lg`
                                                        : isDark ? 'bg-white/[0.06]' : 'bg-gray-100'
                                                        }`}>
                                                        <type.icon size={16} className={isActive ? 'text-white' : isDark ? 'text-gray-500' : 'text-gray-400'} />
                                                    </div>
                                                    <p className={`text-xs font-bold mb-0.5 ${isActive ? type.text : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        {type.label}
                                                    </p>
                                                    <p className={`text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                        {type.desc}
                                                    </p>
                                                    {isActive && (
                                                        <div className={`absolute top-2 right-2 w-4 h-4 rounded-full bg-gradient-to-br ${type.gradient} flex items-center justify-center`}>
                                                            <Check size={10} className="text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Status Selection */}
                                <div>
                                    <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Payment Status
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {statusOptions.map((opt) => {
                                            const isActive = formData.status === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, status: opt.value })}
                                                    className={`px-3 py-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 ${isActive
                                                        ? `${opt.bg} ${opt.color} font-bold`
                                                        : isDark ? 'bg-white/[0.02] border-white/[0.06] text-gray-500 hover:border-white/[0.12]' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <span className={`w-2 h-2 rounded-full transition-all ${isActive ? opt.dot : isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
                                                    <span className="text-xs font-medium">{opt.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Next button */}
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r ${currentType?.gradient || 'from-green-500 to-emerald-500'} text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]`}
                                >
                                    Select Modules <ChevronRight size={16} />
                                </button>
                            </div>
                        )}

                        {/* ═══ STEP 2: MODULE SELECTION ═══ */}
                        {step === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between">
                                    <label className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <Package size={11} className="inline mr-1 -mt-0.5" />
                                        Select Modules
                                    </label>
                                    <button
                                        type="button"
                                        onClick={selectAllModules}
                                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        {selectedModuleIds.length === activeModules.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>

                                {/* Module Cards */}
                                <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1 no-scrollbar">
                                    {activeModules.map((mod, idx) => {
                                        const isSelected = selectedModuleIds.includes(mod.id);
                                        return (
                                            <button
                                                key={mod.id}
                                                type="button"
                                                onClick={() => toggleModule(mod.id)}
                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 text-sm group animate-in fade-in slide-in-from-bottom-1 ${isSelected
                                                    ? isDark
                                                        ? 'bg-green-500/8 border-green-500/25 shadow-sm shadow-green-500/5'
                                                        : 'bg-green-50/80 border-green-400 shadow-sm shadow-green-500/10'
                                                    : isDark
                                                        ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                                                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all duration-200 shrink-0 ${isSelected
                                                        ? 'bg-green-500 border-green-500 scale-110'
                                                        : isDark ? 'border-gray-600 group-hover:border-gray-400' : 'border-gray-300 group-hover:border-gray-400'
                                                        }`}>
                                                        {isSelected && <Check size={11} className="text-white" />}
                                                    </div>
                                                    <div className="text-left min-w-0">
                                                        <span className={`font-semibold block truncate ${isSelected ? isDark ? 'text-green-300' : 'text-green-800' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            {mod.name}
                                                        </span>
                                                        {mod.description && (
                                                            <p className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{mod.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    <div className="text-right">
                                                        <div className={`text-[9px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Cost</div>
                                                        <span className={`text-[11px] font-semibold tabular-nums ${isSelected ? isDark ? 'text-gray-300' : 'text-gray-600' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                            {parseFloat(mod.price || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <ArrowRight size={9} className={isDark ? 'text-gray-700' : 'text-gray-300'} />
                                                    <div className="text-right">
                                                        <div className={`text-[9px] uppercase font-bold tracking-wider ${isSelected ? isDark ? 'text-green-500' : 'text-green-600' : isDark ? 'text-gray-600' : 'text-gray-400'}`}>Client</div>
                                                        <span className={`text-[11px] font-bold tabular-nums ${isSelected ? isDark ? 'text-green-400' : 'text-green-700' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                            {parseFloat(mod.customer_price || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Live Total Ticker */}
                                {selectedModuleIds.length > 0 && (
                                    <div className={`rounded-xl p-3 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200 ${isDark ? 'bg-gradient-to-r from-green-500/8 to-emerald-500/8 border border-green-500/15' : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                                                <Sparkles size={13} className="text-white" />
                                            </div>
                                            <div>
                                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {selectedModuleIds.length} module{selectedModuleIds.length > 1 ? 's' : ''} selected
                                                </p>
                                                <p className={`text-sm font-extrabold tabular-nums ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                                                    {customerTotal.toLocaleString()} EGP
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`text-right`}>
                                            <p className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Profit</p>
                                            <p className={`text-sm font-extrabold tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                +{profit.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Navigation */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className={`px-4 py-2.5 rounded-xl font-medium text-sm border transition-colors ${isDark ? 'border-white/[0.08] text-gray-400 hover:bg-white/[0.04]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => selectedModuleIds.length > 0 ? setStep(3) : setError('Please select at least one module')}
                                        className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r ${currentType?.gradient || 'from-green-500 to-emerald-500'} text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50`}
                                        disabled={selectedModuleIds.length === 0}
                                    >
                                        Review & Submit <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ═══ STEP 3: REVIEW & SUBMIT ═══ */}
                        {step === 3 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">

                                {/* Pricing Summary Card */}
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
                                    {/* Summary Header */}
                                    <div className={`px-5 py-3 flex items-center justify-between ${isDark ? 'bg-white/[0.03] border-b border-white/[0.06]' : 'bg-gray-50 border-b border-gray-100'}`}>
                                        <div className="flex items-center gap-2">
                                            <Receipt size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {formData.invoice_type}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/[0.06] text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                                            {selectedModuleIds.length} module{selectedModuleIds.length > 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {/* Selected Modules List */}
                                    <div className={`px-5 py-3 space-y-2 ${isDark ? 'border-b border-white/[0.06]' : 'border-b border-gray-100'}`}>
                                        {selectedModuleIds.map(id => {
                                            const mod = modules.find(m => m.id === id);
                                            if (!mod) return null;
                                            return (
                                                <div key={id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full bg-green-500`} />
                                                        <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{mod.name}</span>
                                                    </div>
                                                    <span className={`text-xs font-semibold tabular-nums ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {parseFloat(mod.customer_price || 0).toLocaleString()} EGP
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Pricing Breakdown */}
                                    <div className="px-5 py-4 space-y-3">
                                        {/* Cost to UA */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                                                    <Building2 size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                                                </div>
                                                <div>
                                                    <span className={`text-xs font-medium block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Cost to Uniform Agri</span>
                                                    <span className={`text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Base module pricing</span>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-bold tabular-nums ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                {costTotal.toLocaleString()} EGP
                                            </span>
                                        </div>

                                        {/* Divider */}
                                        <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>
                                            <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`} />
                                            <span>markup applied</span>
                                            <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`} />
                                        </div>

                                        {/* Customer Price */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                                                    <Users size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                                                </div>
                                                <div>
                                                    <span className={`text-xs font-medium block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Customer Price</span>
                                                    <span className={`text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>What the client pays</span>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-bold tabular-nums ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                                {customerTotal.toLocaleString()} EGP
                                            </span>
                                        </div>

                                        {/* Profit */}
                                        <div className={`mt-2 pt-3 border-t flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm shadow-green-500/20">
                                                    <TrendingUp size={14} className="text-white" />
                                                </div>
                                                <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Your Profit</span>
                                            </div>
                                            <span className={`text-xl font-extrabold tabular-nums ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                                +{profit.toLocaleString()} <span className="text-xs font-bold">EGP</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className={`block text-[11px] font-bold uppercase mb-2 tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <StickyNote size={10} className="inline mr-1 -mt-0.5" />
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={2}
                                        className={`w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm resize-none transition-all ${isDark ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder-gray-600' : 'border-gray-200 bg-gray-50/50 placeholder-gray-400'}`}
                                        placeholder="Add notes for this invoice..."
                                    />
                                </div>

                                {/* PDF Upload */}
                                <div>
                                    <label className={`block text-[11px] font-bold uppercase mb-2 tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        PDF Attachment (Optional)
                                    </label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${selectedFile
                                            ? isDark ? 'border-green-500/30 bg-green-500/8' : 'border-green-300 bg-green-50'
                                            : isDark ? 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        {selectedFile ? (
                                            <div className={`flex items-center justify-center gap-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                                                <FileText size={18} />
                                                <span className="font-medium text-sm">{selectedFile.name}</span>
                                            </div>
                                        ) : (
                                            <div className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                                                <Upload size={18} className="mx-auto mb-1" />
                                                <p className="text-[10px]">Click to attach PDF</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Navigation */}
                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className={`px-4 py-3 rounded-xl font-medium text-sm border transition-colors ${isDark ? 'border-white/[0.08] text-gray-400 hover:bg-white/[0.04]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || selectedModuleIds.length === 0}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r ${currentType?.gradient || 'from-green-500 to-emerald-500'} text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <CheckCircle size={16} />
                                        )}
                                        {isSubmitting ? 'Creating...' : formData.invoice_type === 'Purchase Quotation' ? 'Create Quotation' : 'Create Invoice'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
