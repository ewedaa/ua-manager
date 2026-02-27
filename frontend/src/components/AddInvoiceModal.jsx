import React, { useState, useRef } from 'react';
import { X, Save, Loader2, AlertCircle, Upload, FileText, Plus, Package, Check, TrendingUp, ArrowRight, DollarSign, Building2, Users, StickyNote } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

export default function AddInvoiceModal({ clientId, clientName, onClose }) {
    const queryClient = useQueryClient();
    const { isDark } = useTheme();
    const fileInputRef = useRef(null);
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

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto ${isDark ? 'bg-gray-900/95 backdrop-blur-xl border border-white/[0.08]' : 'bg-white'}`}>
                {/* Header */}
                <div className={`p-6 border-b flex justify-between items-center sticky top-0 z-10 ${isDark ? 'border-white/[0.06] bg-gray-900/98 backdrop-blur-xl' : 'border-gray-100 bg-white/98 backdrop-blur-xl'}`}>
                    <div>
                        <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                                <FileText size={18} className="text-white" />
                            </div>
                            Create Invoice
                        </h2>
                        <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            for <span className="font-semibold">{clientName}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`transition-colors p-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className={`rounded-xl p-4 flex items-start gap-3 border ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                            <AlertCircle className={`flex-shrink-0 mt-0.5 ${isDark ? 'text-red-400' : 'text-red-500'}`} size={18} />
                            <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-700'}`}>{error}</p>
                        </div>
                    )}

                    {/* Invoice Type */}
                    <div>
                        <label className={`block text-xs font-bold uppercase mb-2 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Invoice Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Renewal Invoice', 'Purchase Invoice', 'Purchase Quotation'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, invoice_type: type })}
                                    className={`px-4 py-2.5 rounded-xl border font-medium text-sm transition-all duration-200 ${formData.invoice_type === type
                                        ? isDark ? 'bg-green-500/15 border-green-500/30 text-green-400 shadow-sm shadow-green-500/10' : 'bg-green-50 border-green-500 text-green-700'
                                        : isDark ? 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-white/[0.15]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Module Selection */}
                    {activeModules.length > 0 && (
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-3 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                <Package size={12} className="inline mr-1.5 -mt-0.5" />
                                Select Modules
                            </label>
                            <div className="space-y-2">
                                {activeModules.map((mod) => {
                                    const isSelected = selectedModuleIds.includes(mod.id);
                                    return (
                                        <button
                                            key={mod.id}
                                            type="button"
                                            onClick={() => toggleModule(mod.id)}
                                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-sm transition-all duration-200 ${isSelected
                                                ? isDark
                                                    ? 'bg-green-500/10 border-green-500/30 shadow-sm shadow-green-500/5'
                                                    : 'bg-green-50 border-green-400 shadow-sm shadow-green-500/10'
                                                : isDark
                                                    ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                                                    : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${isSelected
                                                    ? 'bg-green-500 border-green-500'
                                                    : isDark ? 'border-gray-600' : 'border-gray-300'
                                                    }`}>
                                                    {isSelected && <Check size={12} className="text-white" />}
                                                </div>
                                                <div className="text-left">
                                                    <span className={`font-semibold ${isSelected ? isDark ? 'text-green-300' : 'text-green-800' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        {mod.name}
                                                    </span>
                                                    {mod.description && (
                                                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{mod.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    <div className="text-right">
                                                        <div className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Cost</div>
                                                        <span className={`text-xs font-semibold tabular-nums ${isSelected ? isDark ? 'text-gray-300' : 'text-gray-600' : ''}`}>
                                                            {parseFloat(mod.price || 0).toLocaleString()} EGP
                                                        </span>
                                                    </div>
                                                    <ArrowRight size={10} className={isDark ? 'text-gray-700' : 'text-gray-300'} />
                                                    <div className="text-right">
                                                        <div className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? isDark ? 'text-green-500' : 'text-green-600' : isDark ? 'text-gray-600' : 'text-gray-400'}`}>Customer</div>
                                                        <span className={`text-xs font-bold tabular-nums ${isSelected ? isDark ? 'text-green-400' : 'text-green-700' : ''}`}>
                                                            {parseFloat(mod.customer_price || 0).toLocaleString()} EGP
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Pricing Summary Panel */}
                    {selectedModuleIds.length > 0 && (
                        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
                            <div className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-white/[0.03] text-gray-500 border-b border-white/[0.06]' : 'bg-gray-50 text-gray-500 border-b border-gray-100'}`}>
                                Invoice Summary — {selectedModuleIds.length} module{selectedModuleIds.length > 1 ? 's' : ''}
                            </div>
                            <div className="p-4 space-y-3">
                                {/* Cost to UA */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                                            <Building2 size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                                        </div>
                                        <div>
                                            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Cost to Uniform Agri</span>
                                            <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Base module pricing</p>
                                        </div>
                                    </div>
                                    <span className={`text-base font-bold tabular-nums ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                        {costTotal.toLocaleString()} EGP
                                    </span>
                                </div>

                                {/* Divider with markup info */}
                                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                    <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}></div>
                                    <span>+30% markup +10% fees</span>
                                    <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}></div>
                                </div>

                                {/* Customer Price */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                                            <Users size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                                        </div>
                                        <div>
                                            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Customer Price</span>
                                            <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>What the farm pays you</p>
                                        </div>
                                    </div>
                                    <span className={`text-base font-bold tabular-nums ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                        {customerTotal.toLocaleString()} EGP
                                    </span>
                                </div>

                                {/* Profit */}
                                <div className={`mt-1 pt-3 border-t flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm shadow-green-500/20">
                                            <TrendingUp size={14} className="text-white" />
                                        </div>
                                        <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Your Profit</span>
                                    </div>
                                    <span className={`text-lg font-extrabold tabular-nums ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                        +{profit.toLocaleString()} EGP
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status */}
                    <div>
                        <label className={`block text-xs font-bold uppercase mb-2 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Due', 'Paid to Us', 'Paid to Uniform'].map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status })}
                                    className={`px-3 py-2 rounded-xl border font-medium text-xs transition-all ${formData.status === status
                                        ? status === 'Due'
                                            ? isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-400 text-amber-700'
                                            : isDark ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-green-50 border-green-500 text-green-700'
                                        : isDark ? 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-white/[0.15]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={`block text-xs font-bold uppercase mb-2 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <StickyNote size={12} className="inline mr-1.5 -mt-0.5" />
                            Notes (Optional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={2}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm resize-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600' : 'border-gray-200 bg-gray-50/50 placeholder-gray-400'}`}
                            placeholder="Add notes for this invoice..."
                        />
                    </div>

                    {/* PDF Upload */}
                    <div>
                        <label className={`block text-xs font-bold uppercase mb-2 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            PDF Invoice (Optional)
                        </label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${selectedFile
                                ? isDark ? 'border-green-500/30 bg-green-500/10' : 'border-green-300 bg-green-50'
                                : isDark ? 'border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.03]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                                    <FileText size={20} />
                                    <span className="font-medium">{selectedFile.name}</span>
                                </div>
                            ) : (
                                <div className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                                    <Upload size={22} className="mx-auto mb-1" />
                                    <p className="text-xs">Click to upload PDF</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 px-4 py-3 border rounded-xl transition-colors font-medium ${isDark ? 'border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || selectedModuleIds.length === 0}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white rounded-xl transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl hover:shadow-green-500/20"
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Plus size={18} />
                            )}
                            Create Invoice
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
