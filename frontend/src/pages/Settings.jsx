import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Loader2, Plus, Trash2, Save, X, Edit2, GripVertical, Lock, Bell, Volume2, VolumeX,
    Monitor, Download, Upload, Server, Database, CheckCircle, AlertCircle, FileSpreadsheet,
    Shield, Activity, ChevronRight, ArrowRight, DollarSign, Package, Eye, MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { API_BASE_URL } from '../lib/api';

const API_URL = `${API_BASE_URL}/subscription-modules/`;

const fetchModules = async () => {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Failed to fetch modules');
    return res.json();
};

export default function Settings() {
    const { isAdmin } = useAuth();
    const { soundEnabled, setSoundEnabled, soundTone, setSoundTone, browserNotificationsEnabled, enableBrowserNotifications } = useNotifications();
    const queryClient = useQueryClient();
    const [newModule, setNewModule] = useState('');
    const [newModulePrice, setNewModulePrice] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [editingPrice, setEditingPrice] = useState('');

    // Backup / Import state
    const [isBackingUp, setIsBackingUp] = useState(false);

    // Import Wizard multi-step state
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(1); // 1=upload, 2=sheets, 3=mapping, 4=preview, 5=importing/results
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [selectedSheets, setSelectedSheets] = useState([]);
    const [columnMappings, setColumnMappings] = useState({}); // { sheetName: { colIdx: targetField } }
    const [targetCategory, setTargetCategory] = useState({}); // { sheetName: systemCategory }
    const [isImporting, setIsImporting] = useState(false);
    const [importResults, setImportResults] = useState(null);
    const [importError, setImportError] = useState(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const fileInputRef = useRef(null);

    // System Health
    const [healthData, setHealthData] = useState(null);
    const [isLoadingHealth, setIsLoadingHealth] = useState(false);

    const { data: modules = [], isLoading } = useQuery({
        queryKey: ['subscription-modules'],
        queryFn: fetchModules,
    });

    const createMutation = useMutation({
        mutationFn: async ({ name, price }) => {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, price: price || 0, is_active: true, order: modules.length }),
            });
            if (!res.ok) throw new Error('Failed to create module');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['subscription-modules']);
            setNewModule('');
            setNewModulePrice('');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...data }) => {
            const res = await fetch(`${API_URL}${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update module');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['subscription-modules']);
            setEditingId(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`${API_URL}${id}/`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete module');
        },
        onSuccess: () => queryClient.invalidateQueries(['subscription-modules']),
    });

    const handleAddModule = (e) => {
        e.preventDefault();
        if (newModule.trim()) {
            createMutation.mutate({ name: newModule.trim(), price: parseFloat(newModulePrice) || 0 });
        }
    };

    const handleSaveEdit = (id) => {
        if (editingName.trim()) {
            updateMutation.mutate({ id, name: editingName.trim(), price: parseFloat(editingPrice) || 0 });
        }
    };

    // ── Backup handler ──
    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const res = await fetch(`${API_BASE_URL}/backup/`);
            if (!res.ok) throw new Error('Backup failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const disposition = res.headers.get('Content-Disposition');
            const filename = disposition
                ? disposition.split('filename=')[1]?.replace(/"/g, '')
                : `UA_Manager_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Backup error:', err);
            alert('Failed to create backup. Please try again.');
        } finally {
            setIsBackingUp(false);
        }
    };

    // ── Import Wizard: Step 1 → Preview file ──
    const handleFileUploadForPreview = async () => {
        if (!selectedFile) return;
        setIsPreviewing(true);
        setImportError(null);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const res = await fetch(`${API_BASE_URL}/import-preview/`, { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Preview failed');
            setPreviewData(data);

            // Auto-select all sheets
            setSelectedSheets(data.sheets.map(s => s.name));

            // Auto-map columns by fuzzy matching
            const autoMappings = {};
            const autoCats = {};
            data.sheets.forEach(sheet => {
                // Try to match sheet name to a category
                const categories = Object.keys(data.system_targets);
                const matchedCat = categories.find(c =>
                    c.toLowerCase() === sheet.name.toLowerCase() ||
                    sheet.name.toLowerCase().includes(c.toLowerCase())
                ) || categories[0];
                autoCats[sheet.name] = matchedCat;

                // Auto-map columns
                const fields = data.system_targets[matchedCat] || [];
                const mapping = {};
                sheet.columns.forEach((col, idx) => {
                    const normalizedCol = col.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const matchedField = fields.find(f => {
                        const normalizedField = f.toLowerCase().replace(/_/g, '');
                        const labelField = f.replace(/_/g, ' ').toLowerCase().replace(/[^a-z0-9]/g, '');
                        return normalizedField === normalizedCol || labelField === normalizedCol;
                    });
                    if (matchedField) mapping[idx] = matchedField;
                });
                autoMappings[sheet.name] = mapping;
            });
            setColumnMappings(autoMappings);
            setTargetCategory(autoCats);

            setWizardStep(2);
        } catch (err) {
            setImportError(err.message);
        } finally {
            setIsPreviewing(false);
        }
    };

    // ── Import Wizard: Final import ──
    const handleMappedImport = async () => {
        if (!selectedFile) return;
        setIsImporting(true);
        setImportError(null);
        setImportResults(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            // For now, use the existing import endpoint (it handles both formats)
            const res = await fetch(`${API_BASE_URL}/import/`, { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Import failed');
            setImportResults(data);
            queryClient.invalidateQueries();
            setWizardStep(5);
        } catch (err) {
            setImportError(err.message);
        } finally {
            setIsImporting(false);
        }
    };

    // ── System Health ──
    const loadHealth = async () => {
        setIsLoadingHealth(true);
        try {
            const res = await fetch(`${API_BASE_URL}/system-health/`);
            const data = await res.json();
            setHealthData(data);
        } catch (err) {
            console.error('Health check error:', err);
        } finally {
            setIsLoadingHealth(false);
        }
    };

    useEffect(() => { loadHealth(); }, []);

    const resetWizard = () => {
        setShowImportWizard(false);
        setWizardStep(1);
        setSelectedFile(null);
        setPreviewData(null);
        setSelectedSheets([]);
        setColumnMappings({});
        setTargetCategory({});
        setImportResults(null);
        setImportError(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    const statusIcon = (s) => s === 'ok' ? '✅' : s === 'warning' ? '⚠️' : '❌';
    const statusColor = (s) => s === 'ok' ? 'text-green-600 dark:text-green-400' : s === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

    return (
        <div className="px-4 pb-4 pt-2 md:px-8 md:pb-8 md:pt-6 max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your application configuration</p>
            </div>

            {!isAdmin && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4 flex items-center gap-3">
                    <Lock className="text-blue-500" size={20} />
                    <p className="text-blue-700 dark:text-blue-400 text-sm">
                        <strong>View Only Mode</strong> — Contact an administrator to modify settings.
                    </p>
                </div>
            )}

            {/* ═══════════ SYSTEM HEALTH ═══════════ */}
            {healthData && (
                <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6 backdrop-blur-sm mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${healthData.score >= 80 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : healthData.score >= 50 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                                <Activity size={16} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">System Health</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Score: <span className={`font-bold ${healthData.score >= 80 ? 'text-green-500' : healthData.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{healthData.score}%</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={loadHealth} disabled={isLoadingHealth}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex items-center gap-1">
                            {isLoadingHealth ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />} Refresh
                        </button>
                    </div>

                    {/* Health score bar */}
                    <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full mb-5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${healthData.score >= 80 ? 'bg-green-500' : healthData.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${healthData.score}%` }} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {healthData.checks.map((check) => (
                            <div key={check.category} className="p-4 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
                                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                    <span className="text-base">{check.icon}</span> {check.category}
                                </h3>
                                <div className="space-y-1.5">
                                    {check.items.map((item, i) => (
                                        <div key={i}>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                                                <span className={`font-bold ${statusColor(item.status)}`}>
                                                    {statusIcon(item.status)} {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                                                </span>
                                            </div>
                                            {item.suggestion && (
                                                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 ml-1">💡 {item.suggestion}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════════ DATA MANAGEMENT ═══════════ */}
            <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6 backdrop-blur-sm mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                        <Database size={16} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Data Management</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 ml-11">
                    Backup your entire system to Excel or restore from a previous backup file.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Backup Card */}
                    <div className="p-5 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-3 mb-3">
                            <Download size={20} className="text-emerald-500" />
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Full Backup</h3>
                                <p className="text-xs text-gray-500">Export all data to Excel</p>
                            </div>
                        </div>
                        <button onClick={handleBackup} disabled={isBackingUp}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 hover:shadow-lg hover:shadow-green-500/25">
                            {isBackingUp ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Download size={16} /> Download Backup</>}
                        </button>
                    </div>

                    {/* Import Card */}
                    <div className="p-5 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-3 mb-3">
                            <Upload size={20} className="text-blue-500" />
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Import / Restore</h3>
                                <p className="text-xs text-gray-500">Column-mapping wizard</p>
                            </div>
                        </div>
                        <button onClick={() => { resetWizard(); setShowImportWizard(true); }}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25">
                            <MapPin size={16} /> Open Mapping Wizard
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══════════ IMPORT MAPPING WIZARD MODAL ═══════════ */}
            {showImportWizard && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-white/10 overflow-hidden max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/[0.06] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                    <FileSpreadsheet size={16} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Import Mapping Wizard</h2>
                                    <div className="flex items-center gap-1 mt-1">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s <= wizardStep ? 'bg-blue-500 w-8' : 'bg-gray-200 dark:bg-gray-700 w-4'}`} />
                                        ))}
                                        <span className="text-[10px] text-gray-400 ml-2">
                                            Step {wizardStep}/5
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={resetWizard} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <X size={22} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto flex-1">
                            {/* Step 1: Upload */}
                            {wizardStep === 1 && (
                                <>
                                    <div onClick={() => fileInputRef.current?.click()}
                                        className={`relative p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${selectedFile ? 'border-green-400 bg-green-50/50 dark:bg-green-500/5' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-gray-50/50 dark:bg-white/[0.02]'}`}>
                                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                                            onChange={(e) => { setSelectedFile(e.target.files[0]); setImportError(null); }} />
                                        {selectedFile ? (
                                            <div className="space-y-2">
                                                <FileSpreadsheet size={32} className="mx-auto text-green-500" />
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedFile.name}</p>
                                                <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Upload size={32} className="mx-auto text-gray-400" />
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Click to select an Excel file</p>
                                                <p className="text-xs text-gray-400">.xlsx or .xls</p>
                                            </div>
                                        )}
                                    </div>

                                    {importError && (
                                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                                            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                            <p className="text-xs text-red-700 dark:text-red-400">{importError}</p>
                                        </div>
                                    )}

                                    <button onClick={handleFileUploadForPreview} disabled={!selectedFile || isPreviewing}
                                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                                        {isPreviewing ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><ArrowRight size={16} /> Analyze File</>}
                                    </button>
                                </>
                            )}

                            {/* Step 2: Sheet Selection */}
                            {wizardStep === 2 && previewData && (
                                <>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Select which sheets to import and map to system categories:</p>
                                    <div className="space-y-2">
                                        {previewData.sheets.map(sheet => (
                                            <div key={sheet.name} className={`p-4 rounded-xl border transition-all ${selectedSheets.includes(sheet.name) ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-500/5' : 'border-gray-200 dark:border-white/[0.06]'}`}>
                                                <div className="flex items-center justify-between">
                                                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                        <input type="checkbox" checked={selectedSheets.includes(sheet.name)}
                                                            onChange={(e) => setSelectedSheets(prev => e.target.checked ? [...prev, sheet.name] : prev.filter(s => s !== sheet.name))}
                                                            className="w-4 h-4 text-blue-500 rounded" />
                                                        <div>
                                                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{sheet.name}</span>
                                                            <span className="text-xs text-gray-400 ml-2">{sheet.row_count} rows · {sheet.columns.length} columns</span>
                                                        </div>
                                                    </label>
                                                    {selectedSheets.includes(sheet.name) && (
                                                        <select value={targetCategory[sheet.name] || ''} onChange={(e) => setTargetCategory({ ...targetCategory, [sheet.name]: e.target.value })}
                                                            className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300">
                                                            {Object.keys(previewData.system_targets).map(cat => (
                                                                <option key={cat} value={cat}>{cat}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                                {selectedSheets.includes(sheet.name) && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {sheet.columns.slice(0, 8).map((col, i) => (
                                                            <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded-full text-gray-500">{col}</span>
                                                        ))}
                                                        {sheet.columns.length > 8 && <span className="text-[10px] text-gray-400">+{sheet.columns.length - 8} more</span>}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => setWizardStep(1)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl font-medium text-sm text-gray-600 dark:text-gray-300">Back</button>
                                        <button onClick={() => setWizardStep(3)} disabled={selectedSheets.length === 0}
                                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                                            <ArrowRight size={16} /> Map Columns
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Step 3: Column Mapping */}
                            {wizardStep === 3 && previewData && (
                                <>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Map each column from your file to a system field:</p>
                                    {selectedSheets.map(sheetName => {
                                        const sheet = previewData.sheets.find(s => s.name === sheetName);
                                        if (!sheet) return null;
                                        const cat = targetCategory[sheetName] || Object.keys(previewData.system_targets)[0];
                                        const systemFields = previewData.system_targets[cat] || [];
                                        const mapping = columnMappings[sheetName] || {};

                                        return (
                                            <div key={sheetName} className="p-4 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
                                                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                                    <FileSpreadsheet size={14} className="text-blue-500" /> {sheetName}
                                                    <span className="text-[10px] text-gray-400 font-normal">→ {cat}</span>
                                                </h4>
                                                <div className="space-y-2">
                                                    {sheet.columns.map((col, idx) => (
                                                        <div key={idx} className="flex items-center gap-3">
                                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-32 truncate" title={col}>{col}</span>
                                                            <ArrowRight size={12} className="text-gray-300 shrink-0" />
                                                            <select value={mapping[idx] || ''} onChange={(e) => {
                                                                const newMapping = { ...columnMappings };
                                                                if (!newMapping[sheetName]) newMapping[sheetName] = {};
                                                                if (e.target.value) newMapping[sheetName][idx] = e.target.value;
                                                                else delete newMapping[sheetName][idx];
                                                                setColumnMappings(newMapping);
                                                            }}
                                                                className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300">
                                                                <option value="">— Skip —</option>
                                                                {systemFields.map(f => (
                                                                    <option key={f} value={f}>{f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="flex gap-3">
                                        <button onClick={() => setWizardStep(2)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl font-medium text-sm text-gray-600 dark:text-gray-300">Back</button>
                                        <button onClick={() => setWizardStep(4)}
                                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                            <Eye size={16} /> Preview Data
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Step 4: Preview */}
                            {wizardStep === 4 && previewData && (
                                <>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Preview of data to be imported:</p>
                                    {selectedSheets.map(sheetName => {
                                        const sheet = previewData.sheets.find(s => s.name === sheetName);
                                        if (!sheet) return null;
                                        const mapping = columnMappings[sheetName] || {};
                                        const mappedCols = Object.entries(mapping).map(([idx, field]) => ({ idx: parseInt(idx), field, col: sheet.columns[parseInt(idx)] }));

                                        return (
                                            <div key={sheetName} className="rounded-xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
                                                <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/[0.06]">
                                                    <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{sheetName}</span>
                                                    <span className="text-xs text-gray-400 ml-2">{mappedCols.length} columns mapped</span>
                                                </div>
                                                {mappedCols.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="bg-blue-50 dark:bg-blue-500/10">
                                                                    {mappedCols.map(mc => (
                                                                        <th key={mc.idx} className="px-3 py-2 text-left font-bold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                                                                            {mc.field.replace(/_/g, ' ')}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {sheet.sample_rows.map((row, ri) => (
                                                                    <tr key={ri} className={ri % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50 dark:bg-white/[0.02]'}>
                                                                        {mappedCols.map(mc => (
                                                                            <td key={mc.idx} className="px-3 py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                                                {row[mc.idx] || <span className="text-gray-300">—</span>}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="p-4 text-xs text-gray-400 italic">No columns mapped for this sheet</p>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                                        <Shield size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                        <p className="text-xs text-amber-700 dark:text-amber-400">
                                            <strong>Important:</strong> Records with matching IDs will be <strong>updated</strong>. New records will be <strong>created</strong>.
                                        </p>
                                    </div>

                                    {importError && (
                                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                                            <p className="text-xs text-red-700 dark:text-red-400">{importError}</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button onClick={() => setWizardStep(3)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl font-medium text-sm text-gray-600 dark:text-gray-300">Back</button>
                                        <button onClick={handleMappedImport} disabled={isImporting}
                                            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                                            {isImporting ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : <><Upload size={16} /> Start Import</>}
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Step 5: Results */}
                            {wizardStep === 5 && importResults && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="text-center mb-2">
                                        <CheckCircle size={40} className="mx-auto text-green-500 mb-2" />
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Import Complete!</h3>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {Object.entries(importResults.results).map(([sheet, data]) => (
                                            <div key={sheet} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.06]">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sheet}</span>
                                                <div className="flex items-center gap-3 text-xs">
                                                    {data.created > 0 && <span className="text-green-600 font-bold bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full">+{data.created} new</span>}
                                                    {data.updated > 0 && <span className="text-blue-600 font-bold bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full">↻{data.updated}</span>}
                                                    {data.errors?.length > 0 && <span className="text-red-600 font-bold bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">⚠ {data.errors.length}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {importResults.total_errors > 0 && (
                                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                                            <p className="text-xs font-bold text-red-600 mb-1">{importResults.total_errors} error(s):</p>
                                            <div className="max-h-20 overflow-y-auto text-[10px] text-red-500 space-y-0.5">
                                                {importResults.errors.map((err, i) => <p key={i}>• {err}</p>)}
                                            </div>
                                        </div>
                                    )}

                                    <button onClick={resetWizard}
                                        className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                                        <CheckCircle size={16} /> Done
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ SUBSCRIPTION MODULES (with prices) ═══════════ */}
            <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6 backdrop-blur-sm mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                        <Package size={16} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Subscription Modules</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 ml-11">
                    {isAdmin
                        ? 'Configure modules with prices. These appear when creating invoices — the total auto-calculates from selected modules.'
                        : 'View available modules and their prices. Contact an admin to modify.'}
                </p>

                {/* Add New Module */}
                {isAdmin && (
                    <form onSubmit={handleAddModule} className="flex gap-3 mb-6">
                        <input type="text" placeholder="Module name..." value={newModule} onChange={(e) => setNewModule(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none" />
                        <div className="relative">
                            <input type="number" step="0.01" placeholder="Price" value={newModulePrice} onChange={(e) => setNewModulePrice(e.target.value)}
                                className="w-28 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none pr-12" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">EGP</span>
                        </div>
                        <button type="submit" disabled={createMutation.isPending || !newModule.trim()}
                            className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-green-500/25 transition-all">
                            {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            Add
                        </button>
                    </form>
                )}

                {/* Modules List */}
                <div className="space-y-2">
                    {modules.length === 0 ? (
                        <p className="text-gray-400 text-center py-8 italic">No modules configured yet.</p>
                    ) : (
                        modules.map((mod) => (
                            <div key={mod.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600/30 group hover:border-purple-200 dark:hover:border-purple-500/20 transition-all duration-300">
                                <GripVertical size={16} className="text-gray-300" />

                                {editingId === mod.id && isAdmin ? (
                                    <>
                                        <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)}
                                            className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none" autoFocus />
                                        <div className="relative">
                                            <input type="number" step="0.01" value={editingPrice} onChange={(e) => setEditingPrice(e.target.value)}
                                                className="w-24 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none text-right pr-10" />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">EGP</span>
                                        </div>
                                        <button onClick={() => handleSaveEdit(mod.id)} disabled={updateMutation.isPending} className="text-green-600 hover:text-green-700 p-1.5"><Save size={18} /></button>
                                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 p-1.5"><X size={18} /></button>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-1 font-medium text-gray-700 dark:text-gray-300">{mod.name}</span>
                                        <span className={`text-sm font-bold tabular-nums ${parseFloat(mod.price) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                            {parseFloat(mod.price || 0).toLocaleString()} EGP
                                        </span>
                                        {isAdmin && (
                                            <>
                                                <button onClick={() => { setEditingId(mod.id); setEditingName(mod.name); setEditingPrice(mod.price || '0'); }}
                                                    className="text-gray-400 hover:text-blue-600 p-1.5 opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={16} /></button>
                                                <button onClick={() => { if (confirm(`Delete "${mod.name}"?`)) deleteMutation.mutate(mod.id); }}
                                                    disabled={deleteMutation.isPending}
                                                    className="text-gray-400 hover:text-red-600 p-1.5 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6 backdrop-blur-sm mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                        <Bell size={16} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notification Preferences</h2>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            {soundEnabled ? <Volume2 size={18} className="text-green-500" /> : <VolumeX size={18} className="text-gray-400" />}
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Notification Sounds</p>
                                <p className="text-xs text-gray-500">Play a sound when new notifications arrive</p>
                            </div>
                        </div>
                        <button onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${soundEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {soundEnabled && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.06]">
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Sound Tone</p>
                                <p className="text-xs text-gray-500">Choose your notification sound</p>
                            </div>
                            <select value={soundTone} onChange={(e) => setSoundTone(e.target.value)}
                                className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm">
                                <option value="chime">Chime</option>
                                <option value="bell">Bell</option>
                                <option value="alert">Alert</option>
                            </select>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <Monitor size={18} className="text-blue-500" />
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Browser Notifications</p>
                                <p className="text-xs text-gray-500">Show system notifications in background</p>
                            </div>
                        </div>
                        {browserNotificationsEnabled ? (
                            <span className="text-xs font-medium text-green-500 bg-green-500/10 px-3 py-1 rounded-full">Enabled</span>
                        ) : (
                            <button onClick={enableBrowserNotifications} className="text-xs font-medium text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-xl transition-colors">Enable</button>
                        )}
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                        <Server size={16} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">System Information</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'API Endpoint', value: `${API_BASE_URL}/` },
                        { label: 'Frontend', value: window.location.origin },
                        { label: 'Version', value: '1.6.0' },
                        { label: 'Last Updated', value: new Date().toLocaleDateString() },
                    ].map(item => (
                        <div key={item.label} className="p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.06]">
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{item.label}</span>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-0.5 truncate">{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
