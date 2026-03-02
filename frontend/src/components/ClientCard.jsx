import React, { useState, useRef } from 'react';
import {
    Phone, Calendar, AlertTriangle, MessageSquare, Hash, Layers, FileText,
    Pencil, Receipt, Plus, ExternalLink, CheckCircle, ChevronDown, ChevronUp,
    BellRing, Sparkles, Loader2, DollarSign, Clock, Users, BarChart3,
    Copy, Mail, MapPin, Shield, Tag, TrendingUp, Ticket, Eye,
    UserCircle, Building2, Zap, Trash2, Paperclip, Upload, Download, Image
} from 'lucide-react';
import EditClientModal from './EditClientModal';
import AddInvoiceModal from './AddInvoiceModal';
import InlineEdit from './InlineEdit';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';

export default function ClientCard({ client, viewMode = 'grid' }) {
    const { isAdmin } = useAuth();
    const isCritical = client.alert_status === 'critical';
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [aiSummary, setAiSummary] = useState(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const fileInputRef = useRef(null);
    const whatsappInputRef = useRef(null);
    const queryClient = useQueryClient();

    const handleGenerateSummary = async (e) => {
        e.stopPropagation();
        setIsSummarizing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/ai-client-summary/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_id: client.id })
            });
            const data = await response.json();
            if (data.summary) setAiSummary(data.summary);
        } catch (err) {
            console.error('Error generating summary:', err);
        } finally {
            setIsSummarizing(false);
        }
    };

    // 3D Tilt
    const ref = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e) => {
        if (!ref.current || viewMode === 'list') return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setTilt({ x: (y - rect.height / 2) / 35, y: (rect.width / 2 - x) / 35 });
    };

    const handleMouseLeave = () => { setTilt({ x: 0, y: 0 }); setIsHovered(false); };

    // Financial calculations
    const invoices = client.invoices || [];
    const totalDue = invoices.filter(inv => inv.status === 'Due').reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const paidAmount = invoices.filter(inv => inv.status !== 'Due').reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const tickets = client.tickets || [];
    const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
    const contacts = client.contacts || [];
    const files = client.files || [];
    const generalFiles = files.filter(f => f.category !== 'whatsapp');
    const whatsappFiles = files.filter(f => f.category === 'whatsapp');

    // File upload handler
    const handleFileUpload = async (file, category = 'general') => {
        if (!file) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);
            const response = await fetch(`${API_BASE_URL}/clients/${client.id}/files/`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Upload failed');
            queryClient.invalidateQueries(['clients']);
        } catch (err) {
            console.error('Error uploading file:', err);
        } finally {
            setIsUploading(false);
        }
    };

    // File delete handler
    const handleFileDelete = async (fileId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/clients/${client.id}/files/${fileId}/`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');
            queryClient.invalidateQueries(['clients']);
        } catch (err) {
            console.error('Error deleting file:', err);
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    // File extension badge color
    const getFileExtColor = (name) => {
        const ext = name?.split('.').pop()?.toLowerCase();
        const map = { pdf: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400', doc: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400', docx: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400', xls: 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400', xlsx: 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400', png: 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400', jpg: 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400', jpeg: 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400' };
        return map[ext] || 'bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400';
    };

    // Update invoice
    const updateInvoiceMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            const response = await fetch(`${API_BASE_URL}/invoices/${id}/`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) throw new Error('Failed to update');
            return response.json();
        },
        onSuccess: () => queryClient.invalidateQueries(['clients']),
    });

    // Delete client
    const deleteClientMutation = useMutation({
        mutationFn: async (id) => {
            const response = await fetch(`${API_BASE_URL}/clients/${id}/`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete client');
        },
        onSuccess: () => queryClient.invalidateQueries(['clients']),
    });

    // Inline update
    const updateClientField = async (field, value) => {
        const response = await fetch(`${API_BASE_URL}/clients/${client.id}/`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value }),
        });
        if (!response.ok) throw new Error('Failed to update');
        queryClient.invalidateQueries(['clients']);
        return response.json();
    };

    const extractPhones = (text) => {
        if (!text) return [];
        const matches = text.match(/[\+\d\-\s]{7,}/g);
        return matches ? matches.map(m => m.replace(/[^\d+]/g, '')).filter(p => p.length > 6) : [];
    };
    const extraPhones = extractPhones(client.general_notes);

    const getInitials = (name) => name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : '??';

    // Subscription progress
    const calculateProgress = () => {
        if (!client.subscription_start_date || !client.subscription_end_date) return 0;
        const start = new Date(client.subscription_start_date).getTime();
        const end = new Date(client.subscription_end_date).getTime();
        const now = Date.now();
        if (now > end) return 100;
        if (now < start) return 0;
        return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    };
    const progress = calculateProgress();
    const progressColor = progress > 90 ? 'from-red-500 to-rose-600' : progress > 75 ? 'from-amber-500 to-orange-500' : 'from-green-500 to-emerald-500';

    // Days remaining
    const getDaysRemaining = () => {
        if (!client.subscription_end_date) return null;
        const end = new Date(client.subscription_end_date);
        const now = new Date();
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return diff;
    };
    const daysRemaining = getDaysRemaining();

    // Copy helper
    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1500);
    };

    // Status badge
    const getStatusInfo = () => {
        if (client.is_demo) return { label: 'Demo', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400', dot: 'bg-purple-500' };
        if (daysRemaining !== null && daysRemaining < 0) return { label: 'Expired', color: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400', dot: 'bg-red-500' };
        if (isCritical) return { label: 'Expiring', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', dot: 'bg-amber-500 animate-pulse' };
        return { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400', dot: 'bg-green-500' };
    };
    const status = getStatusInfo();

    // ═══════ LIST MODE ═══════
    if (viewMode === 'list') {
        return (
            <>
                <div className={`flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm ${isCritical ? 'bg-red-50/30 dark:bg-red-950/10 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-white/[0.03] border-gray-100 dark:border-white/[0.06]'} hover:shadow-md group`}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isCritical ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-gradient-to-br from-green-400 to-emerald-600 text-white'}`}>
                            {getInitials(client.farm_name)}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-white truncate">{client.farm_name}</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{client.name}</p>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${status.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                    {status.label}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-right hidden lg:block">
                            <p className="text-[10px] text-gray-400 font-medium uppercase">Expires</p>
                            <p className={`text-sm font-semibold tabular-nums ${isCritical ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{client.subscription_end_date}</p>
                        </div>
                        {totalDue > 0 && (
                            <div className="text-right hidden md:block">
                                <p className="text-[10px] text-orange-500 font-bold uppercase">Due</p>
                                <p className="text-sm font-bold text-orange-600 tabular-nums">{totalDue.toLocaleString()} EGP</p>
                            </div>
                        )}
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <a href={client.whatsapp_link} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors" title="WhatsApp"><MessageSquare size={16} /></a>
                            <a href={`tel:${client.phone}`} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="Call"><Phone size={16} /></a>
                            {isAdmin && <button onClick={() => setIsEditModalOpen(true)} className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors" title="Edit"><Pencil size={16} /></button>}
                            {isAdmin && (
                                <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {isEditModalOpen && <EditClientModal client={client} onClose={() => setIsEditModalOpen(false)} />}
                {isAddInvoiceOpen && <AddInvoiceModal clientId={client.id} clientName={client.farm_name} onClose={() => setIsAddInvoiceOpen(false)} />}
            </>
        );
    }

    // ═══════ GRID MODE ═══════
    const accentColor = isCritical
        ? (daysRemaining !== null && daysRemaining < 0 ? 'bg-red-500' : 'bg-amber-500')
        : 'bg-emerald-500';

    return (
        <>
            <div
                ref={ref}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={handleMouseLeave}
                className={`relative rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col h-full group ${isCritical
                    ? 'bg-white dark:bg-gray-900 border-red-200/50 dark:border-red-800/25'
                    : 'bg-white dark:bg-gray-900 border-gray-200/70 dark:border-white/[0.08]'
                    }`}
                style={{
                    transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.015 : 1})`,
                    boxShadow: isHovered
                        ? isCritical
                            ? '0 20px 50px -10px rgba(239, 68, 68, 0.18), 0 8px 20px -8px rgba(239, 68, 68, 0.1)'
                            : '0 20px 50px -10px rgba(34, 197, 94, 0.15), 0 8px 20px -8px rgba(34, 197, 94, 0.08)'
                        : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
                }}
            >
                {/* Left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor} z-20 rounded-l-2xl`} />

                {/* Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] pointer-events-none z-10" />

                {/* ═══ HEADER ═══ */}
                <div onClick={() => setIsExpanded(!isExpanded)} className="relative cursor-pointer">
                    {/* Progress bar */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gray-100 dark:bg-white/[0.04] z-20">
                        <div className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-1000 rounded-r-full`} style={{ width: `${progress}%` }} />
                    </div>

                    <div className="p-5 pt-5 pl-6">
                        {/* Top Row: Avatar + Name + Status + Actions */}
                        <div className="flex items-start gap-3.5">
                            <div className={`w-12 h-12 rounded-xl flex shrink-0 items-center justify-center font-bold text-sm shadow-lg ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 transition-all duration-300 ${isCritical
                                ? 'bg-gradient-to-br from-red-400 to-rose-600 text-white ring-red-200/50 dark:ring-red-800/30'
                                : 'bg-gradient-to-br from-emerald-400 to-green-600 text-white ring-emerald-200/50 dark:ring-emerald-800/30'
                                } ${isHovered ? 'shadow-xl scale-105' : ''}`}>
                                {getInitials(client.farm_name)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-[15px] font-extrabold text-gray-900 dark:text-white truncate leading-tight tracking-tight">
                                        {isAdmin ? (
                                            <span onClick={e => e.stopPropagation()}>
                                                <InlineEdit value={client.farm_name} onSave={(val) => updateClientField('farm_name', val)} placeholder="Farm name" />
                                            </span>
                                        ) : client.farm_name}
                                    </h3>
                                    <span className={`inline-flex items-center gap-1.5 text-[9px] font-extrabold px-2.5 py-1 rounded-full shrink-0 uppercase tracking-widest ${status.color} shadow-sm`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                        {status.label}
                                    </span>
                                </div>
                                <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate mt-1 font-medium">
                                    {isAdmin ? (
                                        <span onClick={e => e.stopPropagation()}>
                                            <InlineEdit value={client.name} onSave={(val) => updateClientField('name', val)} placeholder="Client name" />
                                        </span>
                                    ) : client.name}
                                </p>
                            </div>

                            {/* Quick Actions + Chevron */}
                            <div className="flex items-center gap-1 shrink-0">
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200" onClick={e => e.stopPropagation()}>
                                    <a href={client.whatsapp_link} target="_blank" rel="noopener noreferrer"
                                        className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-all hover:scale-110" title="WhatsApp">
                                        <MessageSquare size={14} />
                                    </a>
                                    <a href={`tel:${client.phone}`}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all hover:scale-110" title="Call">
                                        <Phone size={14} />
                                    </a>
                                    {isAdmin && (
                                        <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}
                                            className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-all hover:scale-110" title="Edit">
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all hover:scale-110" title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className={`p-1 rounded-lg transition-colors ${isExpanded ? 'bg-gray-100 dark:bg-white/[0.06]' : ''}`}>
                                    {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-400" />}
                                </div>
                            </div>
                        </div>

                        {/* ═══ KPI STRIP ═══ */}
                        <div className="grid grid-cols-4 gap-2.5 mt-4">
                            {/* Days */}
                            <div className={`text-center px-2 py-2 rounded-xl border transition-colors ${daysRemaining !== null && daysRemaining < 0 ? 'bg-red-50/80 dark:bg-red-500/[0.08] border-red-100 dark:border-red-500/10' : daysRemaining !== null && daysRemaining < 60 ? 'bg-amber-50/80 dark:bg-amber-500/[0.08] border-amber-100 dark:border-amber-500/10' : 'bg-gray-50/80 dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.04]'}`}>
                                <Clock size={12} className={`mx-auto mb-1 ${daysRemaining !== null && daysRemaining < 0 ? 'text-red-400' : daysRemaining !== null && daysRemaining < 60 ? 'text-amber-400' : 'text-gray-400'}`} />
                                <p className={`text-sm font-extrabold tabular-nums leading-none ${daysRemaining !== null && daysRemaining < 0 ? 'text-red-600 dark:text-red-400' : daysRemaining !== null && daysRemaining < 60 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {daysRemaining !== null ? (daysRemaining < 0 ? Math.abs(daysRemaining) : daysRemaining) : '—'}
                                </p>
                                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">
                                    {daysRemaining !== null && daysRemaining < 0 ? 'Overdue' : 'Days'}
                                </p>
                            </div>

                            {/* Invoices */}
                            <div className="text-center px-2 py-2 rounded-xl border bg-gray-50/80 dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.04] transition-colors">
                                <Receipt size={12} className="mx-auto mb-1 text-gray-400" />
                                <p className="text-sm font-extrabold tabular-nums text-gray-800 dark:text-gray-200 leading-none">{invoices.length}</p>
                                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">Invoices</p>
                            </div>

                            {/* Due */}
                            <div className={`text-center px-2 py-2 rounded-xl border transition-colors ${totalDue > 0 ? 'bg-orange-50/80 dark:bg-orange-500/[0.08] border-orange-100 dark:border-orange-500/10' : 'bg-gray-50/80 dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.04]'}`}>
                                <DollarSign size={12} className={`mx-auto mb-1 ${totalDue > 0 ? 'text-orange-400' : 'text-gray-400'}`} />
                                <p className={`text-sm font-extrabold tabular-nums leading-none ${totalDue > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {totalDue > 0 ? `${(totalDue / 1000).toFixed(totalDue >= 1000 ? 0 : 1)}k` : '0'}
                                </p>
                                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">Due</p>
                            </div>

                            {/* Tickets */}
                            <div className={`text-center px-2 py-2 rounded-xl border transition-colors ${openTickets > 0 ? 'bg-blue-50/80 dark:bg-blue-500/[0.08] border-blue-100 dark:border-blue-500/10' : 'bg-gray-50/80 dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.04]'}`}>
                                <Ticket size={12} className={`mx-auto mb-1 ${openTickets > 0 ? 'text-blue-400' : 'text-gray-400'}`} />
                                <p className={`text-sm font-extrabold tabular-nums leading-none ${openTickets > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>{openTickets}</p>
                                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">Tickets</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ EXPANDED DETAILS ═══ */}
                {isExpanded && (
                    <div className="flex flex-col flex-1 animate-in slide-in-from-top-2 duration-300">
                        {/* Tab Nav */}
                        <div className="flex border-b border-gray-100 dark:border-white/[0.06] px-2 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'overview', label: 'Overview', icon: Eye },
                                { id: 'invoices', label: 'Finance', icon: DollarSign, badge: totalDue > 0 },
                                { id: 'contacts', label: 'Contacts', icon: Users, count: contacts.length },
                                { id: 'tickets', label: 'Tickets', icon: Ticket, count: openTickets },
                                { id: 'files', label: 'Files', icon: Paperclip, count: generalFiles.length },
                                { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, count: whatsappFiles.length },
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-green-500 text-green-600 dark:text-green-400'
                                        : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                        }`}>
                                    <tab.icon size={13} />
                                    {tab.label}
                                    {tab.badge && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                                    {tab.count > 0 && <span className="text-[9px] bg-gray-100 dark:bg-white/[0.06] px-1 rounded-full ml-0.5">{tab.count}</span>}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 flex-1 relative z-0">

                            {/* ════ TAB: OVERVIEW ════ */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {/* AI Summary */}
                                    <div className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-200/40 dark:border-purple-500/15 rounded-xl p-3.5">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                                                <Sparkles size={13} /> AI Portrait
                                            </h4>
                                            {!aiSummary && !isSummarizing && (
                                                <button onClick={handleGenerateSummary}
                                                    className="text-[10px] font-bold px-2.5 py-1 bg-white dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-800/40 transition-colors">
                                                    Generate
                                                </button>
                                            )}
                                        </div>
                                        {isSummarizing && (
                                            <div className="flex items-center gap-2 text-purple-500/70 text-xs py-1">
                                                <Loader2 size={14} className="animate-spin" /> Analyzing client...
                                            </div>
                                        )}
                                        {aiSummary && <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{aiSummary}</p>}
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Serial */}
                                        <div className="p-2.5 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.04]">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                                                <Hash size={10} /> Serial
                                            </span>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{client.serial_number || 'N/A'}</p>
                                                {client.serial_number && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleCopy(client.serial_number, 'serial'); }}
                                                        className="p-1 text-gray-400 hover:text-green-500 transition-colors rounded">
                                                        {copiedField === 'serial' ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expiry Date */}
                                        <div className={`p-2.5 rounded-xl border ${daysRemaining !== null && daysRemaining < 0 ? 'bg-red-50/50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' : isCritical ? 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/10' : 'bg-gray-50 dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.04]'}`}>
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                                                <Calendar size={10} /> Expires
                                            </span>
                                            <div className={`text-xs font-semibold ${daysRemaining !== null && daysRemaining < 0 ? 'text-red-600 dark:text-red-400' : isCritical ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                                                {isAdmin ? (
                                                    <InlineEdit value={client.subscription_end_date} onSave={(val) => updateClientField('subscription_end_date', val)}
                                                        placeholder="YYYY-MM-DD" validate={(val) => /^\d{4}-\d{2}-\d{2}$/.test(val) || 'Use YYYY-MM-DD'} />
                                                ) : client.subscription_end_date}
                                            </div>
                                        </div>

                                        {/* Subscription Start */}
                                        <div className="p-2.5 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.04]">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                                                <Clock size={10} /> Started
                                            </span>
                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                {client.subscription_start_date || 'N/A'}
                                            </p>
                                        </div>

                                        {/* Phone */}
                                        <div className="p-2.5 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.04]">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                                                <Phone size={10} /> Phone
                                            </span>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{client.phone || 'N/A'}</p>
                                                {client.phone && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleCopy(client.phone, 'phone'); }}
                                                        className="p-1 text-gray-400 hover:text-green-500 transition-colors rounded">
                                                        {copiedField === 'phone' ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modules */}
                                    <div className="p-2.5 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.04]">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                            <Layers size={10} /> Subscription Modules
                                        </span>
                                        {client.subscription_modules ? (
                                            <div className="flex flex-wrap gap-1">
                                                {client.subscription_modules.split(',').map((mod, i) => (
                                                    <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-full border border-green-100 dark:border-green-500/15">
                                                        {mod.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">Standard Subscription</p>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    {client.general_notes && (
                                        <div className="p-2.5 bg-amber-50/40 dark:bg-amber-500/5 rounded-xl border border-amber-100/50 dark:border-amber-500/10">
                                            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                                <FileText size={10} /> Notes
                                            </span>
                                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{client.general_notes}</p>
                                            {extraPhones.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {extraPhones.map((phone, idx) => (
                                                        <a key={idx} href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
                                                            className="inline-flex items-center px-2 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] rounded-full hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors border border-green-100 dark:border-green-500/15">
                                                            <MessageSquare size={9} className="mr-1" /> {phone}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Financial Summary */}
                                    <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-white/[0.02] dark:to-white/[0.01] rounded-xl border border-gray-100 dark:border-white/[0.04]">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-2">
                                            <TrendingUp size={10} /> Financial Summary
                                        </span>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <p className="text-[10px] text-gray-400 mb-0.5">Total Value</p>
                                                <p className="text-sm font-extrabold text-gray-800 dark:text-gray-200 tabular-nums">{totalRevenue.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-green-500 mb-0.5">Paid</p>
                                                <p className="text-sm font-extrabold text-green-600 dark:text-green-400 tabular-nums">{paidAmount.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-orange-500 mb-0.5">Pending</p>
                                                <p className="text-sm font-extrabold text-orange-600 dark:text-orange-400 tabular-nums">{totalDue.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expiry Reminder */}
                                    {isCritical && (
                                        <a href={`https://wa.me/${client.phone?.replace(/[^\d+]/g, '')}?text=${encodeURIComponent(`Hello ${client.name}, this is a gentle reminder that your subscription for ${client.farm_name} is expiring soon on ${client.subscription_end_date}. Please contact us to renew.`)}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 p-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md hover:shadow-red-500/20">
                                            <BellRing size={14} /> Send Expiry Reminder via WhatsApp
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* ════ TAB: FINANCE ════ */}
                            {activeTab === 'invoices' && (
                                <div className="animate-in fade-in duration-300">
                                    {/* Revenue KPIs */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="text-center p-2 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.04]">
                                            <p className="text-xs font-extrabold text-gray-800 dark:text-gray-200 tabular-nums">{totalRevenue.toLocaleString()}</p>
                                            <p className="text-[9px] text-gray-400 font-semibold">TOTAL EGP</p>
                                        </div>
                                        <div className="text-center p-2 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-100 dark:border-green-500/15">
                                            <p className="text-xs font-extrabold text-green-600 dark:text-green-400 tabular-nums">{paidAmount.toLocaleString()}</p>
                                            <p className="text-[9px] text-green-500 font-semibold">COLLECTED</p>
                                        </div>
                                        <div className={`text-center p-2 rounded-xl border ${totalDue > 0 ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/15' : 'bg-gray-50 dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.04]'}`}>
                                            <p className={`text-xs font-extrabold tabular-nums ${totalDue > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-800 dark:text-gray-200'}`}>{totalDue.toLocaleString()}</p>
                                            <p className={`text-[9px] font-semibold ${totalDue > 0 ? 'text-orange-500' : 'text-gray-400'}`}>PENDING</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Invoice History</h4>
                                        {isAdmin && (
                                            <button onClick={() => setIsAddInvoiceOpen(true)}
                                                className="text-[10px] bg-gradient-to-r from-green-500 to-emerald-500 text-white py-1.5 px-3 rounded-lg font-bold flex items-center gap-1 transition-all hover:shadow-md hover:shadow-green-500/20">
                                                <Plus size={12} /> New Invoice
                                            </button>
                                        )}
                                    </div>

                                    {totalDue > 0 && (
                                        <a href={`https://wa.me/${client.phone?.replace(/[^\d+]/g, '')}?text=${encodeURIComponent(`Hello ${client.name}, this is a gentle reminder regarding due payments of ${totalDue.toLocaleString()} EGP for ${client.farm_name}. Please let us know if you need any assistance.`)}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="w-full mb-3 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white p-2 rounded-xl text-xs font-bold transition-all hover:shadow-md hover:shadow-orange-500/20">
                                            <BellRing size={13} /> Send Payment Reminder
                                        </a>
                                    )}

                                    {invoices.length > 0 ? (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                                            {invoices.map((invoice) => (
                                                <div key={invoice.id} className="p-3 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] text-xs hover:border-gray-200 dark:hover:border-white/[0.1] transition-colors">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-extrabold text-sm text-gray-800 dark:text-gray-200 tabular-nums">
                                                                {parseFloat(invoice.total_amount).toLocaleString()} EGP
                                                            </span>
                                                            <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-full font-medium">
                                                                {invoice.invoice_type}
                                                            </span>
                                                        </div>
                                                        {invoice.status === 'Due' ? (
                                                            isAdmin ? (
                                                                <button onClick={() => updateInvoiceMutation.mutate({ id: invoice.id, status: 'Paid to Us' })}
                                                                    className="text-orange-600 dark:text-orange-400 hover:text-green-600 dark:hover:text-green-400 font-bold text-[10px] bg-orange-50 dark:bg-orange-500/15 hover:bg-green-50 dark:hover:bg-green-500/15 px-2 py-1 rounded-lg transition-colors">
                                                                    Due — Mark Paid
                                                                </button>
                                                            ) : (
                                                                <span className="text-orange-600 dark:text-orange-400 font-bold text-[10px] bg-orange-50 dark:bg-orange-500/15 px-2 py-1 rounded-lg">Due</span>
                                                            )
                                                        ) : (
                                                            <span className="text-green-600 dark:text-green-400 font-bold text-[10px] bg-green-50 dark:bg-green-500/15 px-2 py-1 rounded-lg flex items-center gap-1">
                                                                <CheckCircle size={10} /> {invoice.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center text-gray-400">
                                                        <span>{invoice.created_at?.split('T')[0]}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            {invoice.selected_modules?.length > 0 && (
                                                                <span className="text-[9px] text-purple-500 bg-purple-50 dark:bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                                                                    {invoice.selected_modules.length} modules
                                                                </span>
                                                            )}
                                                            {invoice.pdf_file && (
                                                                <a href={invoice.pdf_file} target="_blank" rel="noopener noreferrer"
                                                                    className="text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-blue-500/10 p-1 rounded-lg" title="PDF">
                                                                    <ExternalLink size={11} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-dashed border-gray-200 dark:border-white/[0.06]">
                                            <Receipt size={22} className="text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="text-xs text-gray-400 font-medium">No invoices yet</p>
                                            {isAdmin && (
                                                <button onClick={() => setIsAddInvoiceOpen(true)} className="mt-2 text-[10px] text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                                                    <Plus size={12} /> Create First Invoice
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ════ TAB: CONTACTS ════ */}
                            {activeTab === 'contacts' && (
                                <div className="animate-in fade-in duration-300">
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Users size={12} /> Contact Persons
                                    </h4>

                                    {/* Main Phone */}
                                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-50/30 dark:from-blue-500/10 dark:to-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-500/15 mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                                <Phone size={14} className="text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-blue-500 font-bold uppercase">Primary Phone</p>
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{client.phone || 'Not set'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <a href={`tel:${client.phone}`} className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors"><Phone size={14} /></a>
                                            <a href={client.whatsapp_link} target="_blank" rel="noopener noreferrer" className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-lg transition-colors"><MessageSquare size={14} /></a>
                                            {client.phone && (
                                                <button onClick={() => handleCopy(client.phone, 'mainphone')} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors">
                                                    {copiedField === 'mainphone' ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Contacts List */}
                                    {contacts.length > 0 ? (
                                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1 no-scrollbar">
                                            {contacts.map((contact, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.06] hover:border-gray-200 dark:hover:border-white/[0.1] transition-colors">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-500/15 dark:to-pink-500/15 flex items-center justify-center">
                                                            <UserCircle size={16} className="text-purple-600 dark:text-purple-400" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{contact.name}</span>
                                                                {contact.role && <span className="text-[9px] text-gray-500 bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-full">{contact.role}</span>}
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{contact.phone}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <a href={`tel:${contact.phone}`} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"><Phone size={13} /></a>
                                                        <a href={`https://wa.me/${contact.phone?.replace(/[^\d+]/g, '')}`} target="_blank" rel="noopener noreferrer"
                                                            className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"><MessageSquare size={13} /></a>
                                                        <button onClick={() => handleCopy(contact.phone, `contact-${idx}`)}
                                                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors">
                                                            {copiedField === `contact-${idx}` ? <CheckCircle size={13} className="text-green-500" /> : <Copy size={13} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08]">
                                            <Users size={22} className="text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="text-xs text-gray-400">No contacts added</p>
                                        </div>
                                    )}

                                    {/* Extra phones from notes */}
                                    {extraPhones.length > 0 && (
                                        <div className="mt-3 p-2.5 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.04]">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">Phones from Notes</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {extraPhones.map((phone, idx) => (
                                                    <a key={idx} href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center px-2 py-1 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] rounded-full hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors border border-green-100 dark:border-green-500/15 font-medium">
                                                        <MessageSquare size={9} className="mr-1" /> {phone}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ════ TAB: TICKETS ════ */}
                            {activeTab === 'tickets' && (
                                <div className="animate-in fade-in duration-300">
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Ticket size={12} /> Support History
                                    </h4>
                                    {tickets.length > 0 ? (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                                            {tickets.map((ticket) => (
                                                <div key={ticket.id} className="p-3 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] text-xs hover:border-gray-200 dark:hover:border-white/[0.1] transition-colors">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className={`font-bold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${ticket.status === 'Open' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' :
                                                            ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' :
                                                                'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                                                            }`}>
                                                            {ticket.status}
                                                        </span>
                                                        <span className="text-gray-400 text-[10px] font-medium tabular-nums">{ticket.created_at?.split('T')[0]}</span>
                                                    </div>
                                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{ticket.issue_description}</p>
                                                    {ticket.resolution && (
                                                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-500/5 rounded-lg border border-green-100 dark:border-green-500/10">
                                                            <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase mb-0.5">Resolution</p>
                                                            <p className="text-[11px] text-green-700 dark:text-green-300">{ticket.resolution}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08]">
                                            <Shield size={22} className="text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="text-xs text-gray-400 font-medium">No recorded tickets</p>
                                            <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">This client has clean support history</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ════ TAB: FILES ════ */}
                            {activeTab === 'files' && (
                                <div className="animate-in fade-in duration-300">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <Paperclip size={12} /> Client Files
                                        </h4>
                                        {isAdmin && (
                                            <>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    onChange={(e) => { if (e.target.files[0]) handleFileUpload(e.target.files[0], 'general'); e.target.value = ''; }}
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className="text-[10px] bg-gradient-to-r from-green-500 to-emerald-500 text-white py-1.5 px-3 rounded-lg font-bold flex items-center gap-1 transition-all hover:shadow-md hover:shadow-green-500/20 disabled:opacity-50"
                                                >
                                                    {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                                    {isUploading ? 'Uploading...' : 'Upload File'}
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Drop zone */}
                                    {isAdmin && (
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0], 'general'); }}
                                            className={`mb-3 p-4 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${isDragging
                                                ? 'border-green-400 bg-green-50/50 dark:bg-green-500/10 dark:border-green-500/40'
                                                : 'border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15]'
                                                }`}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload size={18} className={`mx-auto mb-1 ${isDragging ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`} />
                                            <p className={`text-[10px] font-medium ${isDragging ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                                            </p>
                                        </div>
                                    )}

                                    {/* File list */}
                                    {generalFiles.length > 0 ? (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                                            {generalFiles.map((f) => (
                                                <div key={f.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.06] hover:border-gray-200 dark:hover:border-white/[0.1] transition-colors group/file">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getFileExtColor(f.original_name)}`}>
                                                            <FileText size={14} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate" title={f.original_name}>
                                                                {f.original_name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getFileExtColor(f.original_name)}`}>
                                                                    {f.original_name?.split('.').pop()}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400">{formatFileSize(f.file_size)}</span>
                                                                <span className="text-[10px] text-gray-400">{f.uploaded_at?.split('T')[0]}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                                        <a href={f.file?.startsWith('http') ? f.file : `${API_BASE_URL.replace('/api', '')}${f.file}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                            title="Download">
                                                            <Download size={13} />
                                                        </a>
                                                        {isAdmin && (
                                                            <button onClick={() => handleFileDelete(f.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                                title="Delete">
                                                                <Trash2 size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08]">
                                            <Paperclip size={22} className="text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="text-xs text-gray-400 font-medium">No files attached</p>
                                            <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">Upload documents, images, or any files</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ════ TAB: WHATSAPP SCREENSHOTS ════ */}
                            {activeTab === 'whatsapp' && (
                                <div className="animate-in fade-in duration-300">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <MessageSquare size={12} className="text-green-500" /> WhatsApp Screenshots
                                        </h4>
                                        {isAdmin && (
                                            <>
                                                <input
                                                    type="file"
                                                    ref={whatsappInputRef}
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => { if (e.target.files[0]) handleFileUpload(e.target.files[0], 'whatsapp'); e.target.value = ''; }}
                                                />
                                                <button
                                                    onClick={() => whatsappInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className="text-[10px] bg-gradient-to-r from-green-500 to-emerald-500 text-white py-1.5 px-3 rounded-lg font-bold flex items-center gap-1 transition-all hover:shadow-md hover:shadow-green-500/20 disabled:opacity-50"
                                                >
                                                    {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                                    {isUploading ? 'Uploading...' : 'Add Screenshot'}
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Drop zone for WhatsApp */}
                                    {isAdmin && (
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0], 'whatsapp'); }}
                                            className={`mb-3 p-4 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${isDragging
                                                ? 'border-green-400 bg-green-50/50 dark:bg-green-500/10 dark:border-green-500/40'
                                                : 'border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15]'
                                                }`}
                                            onClick={() => whatsappInputRef.current?.click()}
                                        >
                                            <Image size={18} className={`mx-auto mb-1 ${isDragging ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`} />
                                            <p className={`text-[10px] font-medium ${isDragging ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                {isDragging ? 'Drop screenshot here' : 'Drag & drop or click to add screenshots'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Screenshots grid */}
                                    {whatsappFiles.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                                            {whatsappFiles.map((f) => {
                                                const fileUrl = f.file?.startsWith('http') ? f.file : `${API_BASE_URL.replace('/api', '')}${f.file}`;
                                                return (
                                                    <div key={f.id} className="relative group/img rounded-xl overflow-hidden border border-gray-100 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.15] transition-all">
                                                        <img
                                                            src={fileUrl}
                                                            alt={f.original_name}
                                                            className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                                            onClick={() => setPreviewImage(fileUrl)}
                                                        />
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                            <p className="text-[9px] text-white/90 truncate font-medium">{f.original_name}</p>
                                                            <p className="text-[8px] text-white/60">{f.uploaded_at?.split('T')[0]}</p>
                                                        </div>
                                                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                                                className="p-1 bg-white/90 dark:bg-gray-800/90 text-blue-500 rounded-lg shadow-sm hover:bg-white transition-colors" title="Open">
                                                                <ExternalLink size={11} />
                                                            </a>
                                                            {isAdmin && (
                                                                <button onClick={() => handleFileDelete(f.id)}
                                                                    className="p-1 bg-white/90 dark:bg-gray-800/90 text-red-500 rounded-lg shadow-sm hover:bg-white transition-colors" title="Delete">
                                                                    <Trash2 size={11} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08]">
                                            <MessageSquare size={22} className="text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="text-xs text-gray-400 font-medium">No WhatsApp screenshots</p>
                                            <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">Upload conversation screenshots here</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Image preview modal */}
                        {previewImage && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
                                onClick={() => setPreviewImage(null)}>
                                <div className="relative max-w-3xl max-h-[85vh] p-2" onClick={e => e.stopPropagation()}>
                                    <img src={previewImage} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
                                    <button onClick={() => setPreviewImage(null)}
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg font-bold">
                                        ×
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isEditModalOpen && <EditClientModal client={client} onClose={() => setIsEditModalOpen(false)} />}
            {isAddInvoiceOpen && <AddInvoiceModal clientId={client.id} clientName={client.farm_name} onClose={() => setIsAddInvoiceOpen(false)} />}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowDeleteConfirm(false)}>
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-red-100 dark:bg-red-500/15 rounded-xl">
                                <Trash2 size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Client</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to delete <strong>{client.farm_name}</strong> ({client.name})? All associated invoices, contacts, and tickets will also be removed.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">Cancel</button>
                            <button
                                onClick={() => { deleteClientMutation.mutate(client.id); setShowDeleteConfirm(false); }}
                                disabled={deleteClientMutation.isPending}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleteClientMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
