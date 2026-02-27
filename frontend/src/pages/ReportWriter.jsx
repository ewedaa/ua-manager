import React, { useState, useCallback, useMemo } from 'react';
import {
    Users, FileText, Ticket, DollarSign, Barcode, FolderKanban,
    CheckCircle2, Download, Loader2, ArrowRight, ArrowLeft,
    Filter, Eye, X, ChevronRight, LayoutGrid, SlidersHorizontal, FileDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

/* ─── Module Definitions ─────────────────────────────────────── */

const MODULES = [
    {
        key: 'clients',
        label: 'Clients',
        desc: 'Farm names, subscription status, phone numbers',
        icon: Users,
        color: 'emerald',
        gradient: 'from-emerald-500 to-teal-600',
        filters: [
            {
                id: 'status', label: 'Subscription Status', type: 'select', options: [
                    { value: '', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'expired', label: 'Expired' },
                    { value: 'expiring', label: 'Expiring Soon (60 days)' },
                ]
            },
            { id: 'demo_only', label: 'Demo Farms Only', type: 'checkbox' },
        ],
    },
    {
        key: 'invoices',
        label: 'Invoices',
        desc: 'Billing records, amounts, payment status',
        icon: FileText,
        color: 'blue',
        gradient: 'from-blue-500 to-indigo-600',
        filters: [
            {
                id: 'status', label: 'Status', type: 'select', options: [
                    { value: '', label: 'All' },
                    { value: 'Paid to Us', label: 'Paid to Us' },
                    { value: 'Paid to Uniform', label: 'Paid to Uniform' },
                    { value: 'Due', label: 'Due' },
                ]
            },
            {
                id: 'type', label: 'Type', type: 'select', options: [
                    { value: '', label: 'All' },
                    { value: 'Renewal', label: 'Renewal' },
                    { value: 'Purchase', label: 'Purchase' },
                ]
            },
            { id: 'date_from', label: 'From Date', type: 'date' },
            { id: 'date_to', label: 'To Date', type: 'date' },
        ],
    },
    {
        key: 'tickets',
        label: 'Tickets',
        desc: 'Support issues, categories, resolution status',
        icon: Ticket,
        color: 'orange',
        gradient: 'from-orange-500 to-red-500',
        filters: [
            {
                id: 'status', label: 'Status', type: 'select', options: [
                    { value: '', label: 'All' },
                    { value: 'Open', label: 'Open' },
                    { value: 'In Progress', label: 'In Progress' },
                    { value: 'Resolved', label: 'Resolved' },
                    { value: 'Closed', label: 'Closed' },
                ]
            },
            {
                id: 'category', label: 'Category', type: 'select', options: [
                    { value: '', label: 'All' },
                    { value: 'Hardware', label: 'Hardware' },
                    { value: 'Software', label: 'Software' },
                    { value: 'Connectivity', label: 'Connectivity' },
                    { value: 'Training', label: 'Training' },
                    { value: 'Other', label: 'Other' },
                ]
            },
            { id: 'date_from', label: 'From Date', type: 'date' },
            { id: 'date_to', label: 'To Date', type: 'date' },
        ],
    },
    {
        key: 'payments',
        label: 'Payments',
        desc: 'Payment records, inbound/outbound, amounts',
        icon: DollarSign,
        color: 'violet',
        gradient: 'from-violet-500 to-purple-600',
        filters: [
            {
                id: 'direction', label: 'Direction', type: 'select', options: [
                    { value: '', label: 'All' },
                    { value: 'Inbound', label: 'Inbound' },
                    { value: 'Outbound', label: 'Outbound' },
                ]
            },
            { id: 'date_from', label: 'From Date', type: 'date' },
            { id: 'date_to', label: 'To Date', type: 'date' },
        ],
    },
    {
        key: 'serials',
        label: '4Genetics Serials',
        desc: 'Serial numbers, products, assignment status',
        icon: Barcode,
        color: 'rose',
        gradient: 'from-rose-500 to-pink-600',
        filters: [
            {
                id: 'product_type', label: 'Product Type', type: 'select', options: [
                    { value: '', label: 'All' },
                    { value: 'Milk Meter', label: 'Milk Meter' },
                    { value: 'Activity Collar', label: 'Activity Collar' },
                    { value: 'Rumination Tag', label: 'Rumination Tag' },
                    { value: 'Gateway', label: 'Gateway' },
                ]
            },
            {
                id: 'status', label: 'Status', type: 'select', options: [
                    { value: '', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                ]
            },
            {
                id: 'assigned', label: 'Assignment', type: 'select', options: [
                    { value: '', label: 'All' },
                    { value: 'assigned', label: 'Assigned to Client' },
                    { value: 'unassigned', label: 'Unassigned' },
                ]
            },
        ],
    },
    {
        key: 'projects',
        label: 'Projects',
        desc: 'Project tracking, status, descriptions',
        icon: FolderKanban,
        color: 'amber',
        gradient: 'from-amber-500 to-yellow-600',
        filters: [
            {
                id: 'status', label: 'Status', type: 'select', options: [
                    { value: '', label: 'All' },
                    { value: 'Active', label: 'Active' },
                    { value: 'On Hold', label: 'On Hold' },
                    { value: 'Completed', label: 'Completed' },
                ]
            },
        ],
    },
];

const STEPS = [
    { id: 1, label: 'Select Data', icon: LayoutGrid },
    { id: 2, label: 'Configure Filters', icon: SlidersHorizontal },
    { id: 3, label: 'Preview & Export', icon: FileDown },
];

const colorMap = {
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500', ring: 'ring-emerald-500/40', activeBg: 'bg-emerald-500/20' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500', ring: 'ring-blue-500/40', activeBg: 'bg-blue-500/20' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500', ring: 'ring-orange-500/40', activeBg: 'bg-orange-500/20' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-500', ring: 'ring-violet-500/40', activeBg: 'bg-violet-500/20' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-500', ring: 'ring-rose-500/40', activeBg: 'bg-rose-500/20' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500', ring: 'ring-amber-500/40', activeBg: 'bg-amber-500/20' },
};

/* ─── Component ──────────────────────────────────────────────── */

export default function ReportWriter() {
    const { isDark } = useTheme();

    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [selectedModules, setSelectedModules] = useState([]);
    const [moduleFilters, setModuleFilters] = useState({});
    const [previewData, setPreviewData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = useCallback((msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const toggleModule = (key) => {
        setSelectedModules(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const updateFilter = (moduleKey, filterId, value) => {
        setModuleFilters(prev => ({
            ...prev,
            [moduleKey]: { ...(prev[moduleKey] || {}), [filterId]: value }
        }));
    };

    const selectedModuleDefs = useMemo(() =>
        MODULES.filter(m => selectedModules.includes(m.key)),
        [selectedModules]);

    /* ─── Preview ─────────────────────────────── */

    const fetchPreview = async () => {
        setIsLoading(true);
        try {
            const modules = selectedModules.map(key => ({
                key,
                filters: cleanFilters(moduleFilters[key] || {})
            }));
            const res = await fetch(`${API_BASE_URL}/report-builder-preview/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modules }),
            });
            if (!res.ok) throw new Error('Preview failed');
            const data = await res.json();
            setPreviewData(data);
            setStep(3);
        } catch (err) {
            console.error(err);
            showToast('Could not fetch data preview.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    /* ─── Generate PDF ────────────────────────── */

    const generatePDF = async () => {
        setIsGenerating(true);
        try {
            const modules = selectedModules.map(key => ({
                key,
                filters: cleanFilters(moduleFilters[key] || {})
            }));
            const res = await fetch(`${API_BASE_URL}/report-builder/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title || 'Custom Report', modules }),
            });
            if (!res.ok) throw new Error('Generation failed');
            const data = await res.json();
            window.open(data.pdf_url, '_blank');
            showToast('PDF generated successfully!');
        } catch (err) {
            console.error(err);
            showToast('Failed to generate PDF.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const cleanFilters = (f) => {
        const cleaned = {};
        Object.entries(f).forEach(([k, v]) => {
            if (v !== '' && v !== false && v !== null && v !== undefined) cleaned[k] = v;
        });
        return cleaned;
    };

    /* ─── Render ──────────────────────────────── */

    const cardBase = isDark
        ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
        : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm';

    const inputBase = isDark
        ? 'bg-white/[0.04] border-white/10 text-white'
        : 'bg-white border-gray-200 text-gray-900';

    return (
        <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">

            {/* Header */}
            <div className="mb-8">
                <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Report Builder
                </h1>
                <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Select data modules, apply filters, and generate professional PDF reports from your live data.
                </p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-8">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isActive = step === s.id;
                    const isDone = step > s.id;
                    return (
                        <React.Fragment key={s.id}>
                            {i > 0 && <div className={`flex-1 h-px max-w-16 ${isDone ? 'bg-emerald-500' : isDark ? 'bg-white/10' : 'bg-gray-200'}`} />}
                            <button
                                onClick={() => {
                                    if (s.id <= step || (s.id === 2 && selectedModules.length > 0) || (s.id === 3 && previewData)) {
                                        if (s.id === 3 && !previewData) return;
                                        setStep(s.id);
                                    }
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${isActive
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                    : isDone
                                        ? isDark ? 'bg-emerald-500/5 text-emerald-400/70 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        : isDark ? 'bg-white/[0.02] text-gray-500 border-white/5' : 'bg-gray-50 text-gray-400 border-gray-200'
                                    }`}
                            >
                                {isDone ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                                <span className="hidden sm:inline">{s.label}</span>
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* ─── STEP 1: Module Selection ─────────────── */}
            {step === 1 && (
                <div className="space-y-6">
                    {/* Report Title */}
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Report Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Monthly Performance Report — February 2026"
                            className={`w-full px-4 py-3 rounded-xl border text-base outline-none transition-all focus:ring-2 focus:ring-emerald-500/30 ${inputBase}`}
                        />
                    </div>

                    <div>
                        <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Which data do you want in the report?
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {MODULES.map(mod => {
                                const Icon = mod.icon;
                                const selected = selectedModules.includes(mod.key);
                                const colors = colorMap[mod.color];
                                return (
                                    <button
                                        key={mod.key}
                                        onClick={() => toggleModule(mod.key)}
                                        className={`group relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${selected
                                            ? `${colors.activeBg} ${colors.border} ring-2 ${colors.ring}`
                                            : `${cardBase} border`
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center`}>
                                                <Icon size={22} className={colors.text} />
                                            </div>
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selected
                                                ? `bg-emerald-500 border-emerald-500`
                                                : isDark ? 'border-white/20' : 'border-gray-300'
                                                }`}>
                                                {selected && <CheckCircle2 size={14} className="text-white" />}
                                            </div>
                                        </div>
                                        <h3 className={`font-bold text-base mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{mod.label}</h3>
                                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{mod.desc}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={() => selectedModules.length > 0 && setStep(2)}
                            disabled={selectedModules.length === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-semibold transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-40 disabled:scale-100"
                        >
                            Configure Filters <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* ─── STEP 2: Filter Configuration ────────── */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <Filter size={20} className="inline mr-2 text-emerald-500" />
                            Configure Filters
                        </h2>
                        <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {selectedModules.length} module{selectedModules.length !== 1 ? 's' : ''} selected
                        </span>
                    </div>

                    {selectedModuleDefs.map(mod => {
                        const Icon = mod.icon;
                        const colors = colorMap[mod.color];
                        const currentFilters = moduleFilters[mod.key] || {};
                        return (
                            <div key={mod.key} className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                        <Icon size={18} className={colors.text} />
                                    </div>
                                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{mod.label}</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {mod.filters.map(f => (
                                        <div key={f.id}>
                                            <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {f.label}
                                            </label>
                                            {f.type === 'select' && (
                                                <select
                                                    value={currentFilters[f.id] || ''}
                                                    onChange={e => updateFilter(mod.key, f.id, e.target.value)}
                                                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-emerald-500/30 ${inputBase}`}
                                                >
                                                    {f.options.map(o => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                            )}
                                            {f.type === 'date' && (
                                                <input
                                                    type="date"
                                                    value={currentFilters[f.id] || ''}
                                                    onChange={e => updateFilter(mod.key, f.id, e.target.value)}
                                                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-emerald-500/30 ${inputBase}`}
                                                />
                                            )}
                                            {f.type === 'checkbox' && (
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={currentFilters[f.id] || false}
                                                        onChange={e => updateFilter(mod.key, f.id, e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                                                    />
                                                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Yes</span>
                                                </label>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex justify-between pt-4">
                        <button
                            onClick={() => setStep(1)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all border ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <ArrowLeft size={18} /> Back
                        </button>
                        <button
                            onClick={fetchPreview}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-semibold transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-40"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                            Preview Data
                        </button>
                    </div>
                </div>
            )}

            {/* ─── STEP 3: Data Preview & Export ─────────── */}
            {step === 3 && previewData && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <Eye size={20} className="inline mr-2 text-emerald-500" />
                            Data Preview
                        </h2>
                        <button
                            onClick={generatePDF}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-semibold transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-40"
                        >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            Generate PDF
                        </button>
                    </div>

                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.entries(previewData).map(([key, data]) => {
                            const mod = MODULES.find(m => m.key === key);
                            if (!mod) return null;
                            const colors = colorMap[mod.color];
                            const Icon = mod.icon;
                            return (
                                <div key={key} className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon size={16} className={colors.text} />
                                        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{mod.label}</span>
                                    </div>
                                    <p className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.count || 0}</p>
                                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>records found</p>
                                    {data.total !== undefined && (
                                        <p className={`text-sm font-bold mt-1 ${colors.text}`}>${data.total.toLocaleString()}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Data Tables */}
                    {Object.entries(previewData).map(([key, data]) => {
                        const mod = MODULES.find(m => m.key === key);
                        if (!mod || !data.rows || data.rows.length === 0) return null;
                        const colors = colorMap[mod.color];
                        const Icon = mod.icon;
                        return (
                            <div key={key} className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className={`flex items-center gap-2 px-5 py-3 border-b ${isDark ? 'border-white/10 bg-white/[0.01]' : 'border-gray-100 bg-gray-50/50'}`}>
                                    <Icon size={16} className={colors.text} />
                                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{mod.label}</span>
                                    <span className={`ml-auto text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{data.rows.length} rows</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className={isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}>
                                                {data.columns.map(col => (
                                                    <th key={col} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.rows.slice(0, 50).map((row, ri) => (
                                                <tr key={ri} className={`border-t transition-colors ${isDark ? 'border-white/5 hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50/50'}`}>
                                                    {row.map((cell, ci) => (
                                                        <td key={ci} className={`px-4 py-2.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {data.rows.length > 50 && (
                                        <div className={`px-4 py-2 text-center text-xs ${isDark ? 'text-gray-500 bg-white/[0.02]' : 'text-gray-400 bg-gray-50'}`}>
                                            Showing 50 of {data.rows.length} rows. The full data will be included in the PDF.
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex justify-between pt-4">
                        <button
                            onClick={() => setStep(2)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all border ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <ArrowLeft size={18} /> Adjust Filters
                        </button>
                        <button
                            onClick={generatePDF}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-semibold transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-40"
                        >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            Generate PDF
                        </button>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-bottom-4 ${toast.type === 'error'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                    {toast.type === 'error' ? <X size={18} /> : <CheckCircle2 size={18} />}
                    <span className="font-medium text-sm">{toast.msg}</span>
                </div>
            )}
        </div>
    );
}
