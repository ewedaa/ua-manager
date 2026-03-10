import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';
import { fetchClient } from '../lib/fetchers';
import EditClientModal from '../components/EditClientModal';
import AddContactModal from '../components/AddContactModal';
import InlineEdit, { InlineEditDate, InlineEditNumber } from '../components/InlineEdit';
import {
    ArrowLeft, Phone, Calendar, MessageSquare, Hash, FileText,
    Pencil, Receipt, Plus, CheckCircle, Clock, Users, DollarSign,
    Copy, Shield, TrendingUp, Ticket, Trash2, Paperclip, Upload,
    Download, Image, Loader2, Sparkles, ExternalLink, Eye,
    ChevronRight, Building2, Mail, MapPin, Tag, X, AlertTriangle
} from 'lucide-react';

export default function ClientDetailPage({ embeddedClientId, onClose }) {
    const { id: paramId } = useParams();
    const id = embeddedClientId || paramId;
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const { isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const whatsappInputRef = useRef(null);

    const [activeSection, setActiveSection] = useState('overview');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [copiedField, setCopiedField] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [expandedTicket, setExpandedTicket] = useState(null);
    const [uploadModal, setUploadModal] = useState(null); // { file, category }
    const [isAddContactOpen, setIsAddContactOpen] = useState(false);

    // Fetch the individual client detail
    const { data: client, isLoading } = useQuery({
        queryKey: ['client', id],
        queryFn: () => fetchClient(id),
        enabled: !!id,
    });

    // Redirect to Serials Page if someone tries to access a 4Genetics College directly via /clients/:id
    useEffect(() => {
        if (client?.is_4genetics_college && !embeddedClientId && window.location.pathname.startsWith('/clients/')) {
            navigate('/serials', { replace: true });
        }
    }, [client, embeddedClientId, navigate]);

    // Mutations
    const updateInvoiceMutation = useMutation({
        mutationFn: async ({ id: invId, status }) => {
            const res = await fetch(`${API_BASE_URL}/invoices/${invId}/`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['client', id]);
            queryClient.invalidateQueries(['clients']);
        },
    });

    const deleteClientMutation = useMutation({
        mutationFn: async (clientId) => {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clients']);
            navigate('/clients');
        },
    });

    const updateClientMutation = useMutation({
        mutationFn: async (updates) => {
            const res = await fetch(`${API_BASE_URL}/clients/${client.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) {
                let errorMsg = 'Failed to update client';
                try {
                    const errData = await res.json();
                    errorMsg = typeof errData === 'object' ? Object.values(errData).flat().join(', ') : errData;
                } catch (e) {
                    errorMsg = `Server Error (${res.status})`;
                }
                throw new Error(errorMsg);
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['client', id]);
            queryClient.invalidateQueries(['clients']);
        },
    });

    // Helpers
    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1500);
    };

    const handleFileUpload = async (file, category = 'general', meta = {}) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);
            if (meta.description) formData.append('description', meta.description);
            if (meta.contact_person) formData.append('contact_person', meta.contact_person);
            if (meta.file_date) formData.append('file_date', meta.file_date);
            const res = await fetch(`${API_BASE_URL}/clients/${client.id}/files/`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Upload failed');
            queryClient.invalidateQueries(['client', id]);
            queryClient.invalidateQueries(['clients']);
        } catch (err) { console.error(err); } finally { setIsUploading(false); }
    };

    const openUploadModal = (file, category) => {
        setUploadModal({ file, category, description: '', contact_person: '', file_date: '' });
    };

    const submitUploadModal = () => {
        if (!uploadModal) return;
        handleFileUpload(uploadModal.file, uploadModal.category, {
            description: uploadModal.description,
            contact_person: uploadModal.contact_person,
            file_date: uploadModal.file_date,
        });
        setUploadModal(null);
    };

    const handleFileDelete = async (fileId) => {
        try {
            await fetch(`${API_BASE_URL}/clients/${client.id}/files/${fileId}/`, { method: 'DELETE' });
            queryClient.invalidateQueries(['client', id]);
            queryClient.invalidateQueries(['clients']);
        } catch (err) { console.error(err); }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const getFileExtColor = (name) => {
        const ext = name?.split('.').pop()?.toLowerCase();
        const map = { pdf: 'bg-red-500/10 text-red-500', doc: 'bg-blue-500/10 text-blue-500', docx: 'bg-blue-500/10 text-blue-500', xls: 'bg-green-500/10 text-green-500', xlsx: 'bg-green-500/10 text-green-500', png: 'bg-purple-500/10 text-purple-500', jpg: 'bg-purple-500/10 text-purple-500', jpeg: 'bg-purple-500/10 text-purple-500' };
        return map[ext] || 'bg-gray-500/10 text-gray-500';
    };

    const getInitials = (name) => name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : '??';

    // Format phone: ensure +2 prefix for Egyptian numbers
    const formatPhone = (phone) => {
        if (!phone) return '';
        let cleaned = phone.replace(/\s+/g, '');
        if (cleaned.startsWith('+2')) return cleaned;
        if (cleaned.startsWith('002')) return '+2' + cleaned.slice(3);
        if (cleaned.startsWith('2')) return '+' + cleaned;
        if (cleaned.startsWith('0')) return '+2' + cleaned;
        if (/^\d{10,11}$/.test(cleaned)) return '+2' + cleaned;
        return cleaned.startsWith('+') ? cleaned : '+2' + cleaned;
    };

    const getWhatsAppLink = (phone) => {
        const num = formatPhone(phone).replace(/[^\d]/g, '');
        return `https://wa.me/${num}`;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 size={40} className="text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertTriangle size={48} className="text-amber-500" />
                <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Client not found</p>
                <button onClick={() => navigate('/clients')} className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors">
                    Back to Clients
                </button>
            </div>
        );
    }

    // Derived data
    const invoices = client.invoices || [];
    const financialInvoices = invoices.filter(inv => !inv.invoice_type?.toLowerCase().includes('quotation'));
    const totalDue = financialInvoices.filter(inv => inv.status === 'Due').reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const paidAmount = financialInvoices.filter(inv => inv.status !== 'Due').reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const totalRevenue = financialInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const tickets = client.tickets || [];
    const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
    const contacts = client.contacts || [];
    const files = client.files || [];
    const generalFiles = files.filter(f => f.category !== 'whatsapp');
    const whatsappFiles = files.filter(f => f.category === 'whatsapp');

    const parsedModules = Array.isArray(client.subscription_modules)
        ? client.subscription_modules
        : (client.subscription_modules || '').split(',').map(s => s.trim()).filter(Boolean);

    const getDaysRemaining = () => {
        if (!client.subscription_end_date) return null;
        return Math.ceil((new Date(client.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24));
    };
    const daysRemaining = getDaysRemaining();

    const isCritical = client.alert_status === 'critical';
    const getStatusInfo = () => {
        if (client.is_demo) return { label: 'Demo', color: 'bg-purple-500/15 text-purple-400', dot: 'bg-purple-500', gradient: 'from-purple-500 to-violet-600' };
        if (daysRemaining !== null && daysRemaining < 0) return { label: 'Expired', color: 'bg-red-500/15 text-red-400', dot: 'bg-red-500', gradient: 'from-red-500 to-rose-600' };
        if (isCritical) return { label: 'Expiring', color: 'bg-amber-500/15 text-amber-400', dot: 'bg-amber-500 animate-pulse', gradient: 'from-amber-500 to-orange-600' };
        return { label: 'Active', color: 'bg-green-500/15 text-green-400', dot: 'bg-green-500', gradient: 'from-green-500 to-emerald-600' };
    };
    const status = getStatusInfo();

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

    const sections = [
        { id: 'overview', label: 'Overview', icon: Eye },
        ...(client.is_4genetics_college ? [] : [{ id: 'finance', label: 'Finance', icon: DollarSign, badge: totalDue > 0 ? `${totalDue.toLocaleString()}` : null }]),
        { id: 'contacts', label: 'Contacts', icon: Users, count: contacts.length },
        { id: 'tickets', label: 'Tickets', icon: Ticket, count: openTickets },
        { id: 'files', label: 'Files', icon: Paperclip, count: generalFiles.length },
        { id: 'whatsapp', label: 'WhatsApp', icon: Image, count: whatsappFiles.length },
    ];

    return (
        <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
            {/* ═══ TOP BAR ═══ */}
            <div className={`sticky top-0 z-30 backdrop-blur-xl border-b ${isDark ? 'bg-gray-950/80 border-white/[0.06]' : 'bg-white/80 border-gray-200'}`}>
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose ? onClose : () => navigate('/clients')} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.06] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                            {onClose ? <X size={20} /> : <ArrowLeft size={20} />}
                        </button>
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-gradient-to-br ${status.gradient} text-white shadow-lg`}>
                                {getInitials(client.name)}
                            </div>
                            <div>
                                <h1 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{client.name}</h1>
                            </div>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest ${status.color}`}>
                                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${status.dot}`} />
                                {status.label}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href={client.whatsapp_link} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:text-green-400 hover:bg-green-500/10' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}>
                            <MessageSquare size={18} />
                        </a>
                        {isAdmin && (
                            <button onClick={() => setIsEditModalOpen(true)} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/10' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
                                <Pencil size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-6 py-6">
                <div className="flex gap-6">
                    {/* ═══ LEFT SIDEBAR ═══ */}
                    <div className="w-72 shrink-0 hidden lg:block">
                        <div className={`rounded-2xl border p-5 sticky top-20 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                            {/* Avatar & Name */}
                            <div className="text-center mb-4">
                                <div className={`w-20 h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center font-bold text-2xl bg-gradient-to-br ${status.gradient} text-white shadow-xl`}>
                                    {getInitials(client.name)}
                                </div>
                                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{client.name}</h2>
                            </div>

                            {/* Section Nav — TOP PRIORITY */}
                            <nav className="space-y-1 mb-4 pb-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}>
                                {sections.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setActiveSection(s.id)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${activeSection === s.id
                                            ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                                            : isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <s.icon size={14} />
                                        <span className="flex-1 text-left">{s.label}</span>
                                        {s.count > 0 && <span className={`text-[10px] font-bold px-1.5 rounded-full ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>{s.count}</span>}
                                        {s.badge && <span className="text-[10px] font-bold text-orange-500">{s.badge}</span>}
                                    </button>
                                ))}
                            </nav>

                            {/* Subscription Progress */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Subscription</span>
                                    <span className={`text-xs font-bold tabular-nums ${progress > 90 ? 'text-red-500' : progress > 75 ? 'text-amber-500' : isDark ? 'text-green-400' : 'text-green-600'}`}>
                                        {daysRemaining !== null ? `${daysRemaining < 0 ? Math.abs(daysRemaining) + 'd overdue' : daysRemaining + 'd left'}` : '—'}
                                    </span>
                                </div>
                                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                                    <div className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }} />
                                </div>
                            </div>

                            {/* Info Cards */}
                            <div className="space-y-2.5">
                                {[
                                    { icon: Hash, label: 'Serial', value: client.serial_number || '—', copy: true },
                                    { icon: Calendar, label: 'Started', value: client.subscription_start_date || '—' },
                                    { icon: Calendar, label: 'Expires', value: client.subscription_end_date || '—', critical: daysRemaining !== null && daysRemaining < 30 },
                                ].map((item, i) => (
                                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.critical ? 'bg-red-500/10' : isDark ? 'bg-white/[0.06]' : 'bg-white'}`}>
                                            <item.icon size={14} className={item.critical ? 'text-red-500' : isDark ? 'text-gray-400' : 'text-gray-500'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{item.label}</p>
                                            <p className={`text-xs font-semibold truncate ${item.critical ? 'text-red-500' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.value}</p>
                                        </div>
                                        {item.copy && item.value !== '—' && (
                                            <button onClick={() => handleCopy(item.value, item.label)} className={`p-1 rounded-lg transition-colors ${copiedField === item.label ? 'text-green-500' : isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'}`}>
                                                {copiedField === item.label ? <CheckCircle size={12} /> : <Copy size={12} />}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Modules */}
                            {parsedModules.length > 0 && (
                                <div className="mt-4">
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Modules</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {parsedModules.map((mod, i) => (
                                            <span key={i} className={`text-[10px] font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                                                {mod.name || mod}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Delete Button */}
                            {isAdmin && (
                                <div className="mt-4 pt-4 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}>
                                    {!showDeleteConfirm ? (
                                        <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors">
                                            <Trash2 size={14} /> Delete Client
                                        </button>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-xs text-red-500 font-medium text-center">Are you sure?</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowDeleteConfirm(false)} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-white/[0.06] text-gray-400' : 'bg-gray-100 text-gray-600'}`}>Cancel</button>
                                                <button onClick={() => deleteClientMutation.mutate(client.id)} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600">Delete</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ MAIN CONTENT ═══ */}
                    <div className="flex-1 min-w-0">
                        {/* Mobile Section Nav */}
                        <div className={`lg:hidden flex overflow-x-auto no-scrollbar gap-1 mb-4 p-1 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
                            {sections.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setActiveSection(s.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeSection === s.id
                                        ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white text-emerald-700 shadow-sm'
                                        : isDark ? 'text-gray-500' : 'text-gray-500'
                                        }`}
                                >
                                    <s.icon size={13} />{s.label}
                                </button>
                            ))}
                        </div>

                        {/* KPI Cards - Clickable to jump to sections */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            {[
                                { icon: Clock, label: 'Days Left', value: daysRemaining !== null ? (daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : daysRemaining) : '—', color: daysRemaining !== null && daysRemaining < 30 ? 'text-red-500' : 'text-emerald-500', iconBg: daysRemaining !== null && daysRemaining < 30 ? 'bg-red-500/10' : 'bg-emerald-500/10', section: 'overview' },
                                { icon: Receipt, label: 'Invoices', value: client.is_4genetics_college ? <span className="text-sm font-semibold text-gray-400">4Genetics College</span> : invoices.length, color: client.is_4genetics_college ? 'text-gray-400' : (isDark ? 'text-blue-400' : 'text-blue-600'), iconBg: client.is_4genetics_college ? (isDark ? 'bg-white/[0.06]' : 'bg-gray-100') : 'bg-blue-500/10', section: 'finance', strikethrough: client.is_4genetics_college },
                                { icon: DollarSign, label: 'Due Amount', value: client.is_4genetics_college ? <span className="text-sm font-semibold text-gray-400">—</span> : (totalDue > 0 ? `${totalDue.toLocaleString()} €` : '0'), color: client.is_4genetics_college ? 'text-gray-400' : (totalDue > 0 ? 'text-orange-500' : isDark ? 'text-gray-400' : 'text-gray-600'), iconBg: client.is_4genetics_college ? (isDark ? 'bg-white/[0.06]' : 'bg-gray-100') : (totalDue > 0 ? 'bg-orange-500/10' : isDark ? 'bg-white/[0.06]' : 'bg-gray-100'), section: 'finance', strikethrough: client.is_4genetics_college },
                                { icon: Ticket, label: 'Open Tickets', value: openTickets, color: openTickets > 0 ? 'text-violet-500' : isDark ? 'text-gray-400' : 'text-gray-600', iconBg: openTickets > 0 ? 'bg-violet-500/10' : isDark ? 'bg-white/[0.06]' : 'bg-gray-100', section: 'tickets' },
                            ].map((kpi, i) => {
                                const isClickable = !(client.is_4genetics_college && kpi.section === 'finance');
                                return (
                                    <div key={i} onClick={() => isClickable && setActiveSection(kpi.section)} className={`rounded-xl border p-4 transition-all ${isClickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default opacity-80'} ${isClickable && isDark ? 'hover:border-white/[0.12]' : ''} ${isClickable && !isDark ? 'hover:border-gray-300 hover:shadow-md' : ''} ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                                                <kpi.icon size={18} className={kpi.color} />
                                            </div>
                                            <div>
                                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'} ${kpi.strikethrough ? 'line-through opacity-60' : ''}`}>{kpi.label}</p>
                                                <p className={`text-lg font-extrabold tabular-nums ${kpi.color}`}>{kpi.value}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* ═══ OVERVIEW SECTION ═══ */}
                        {activeSection === 'overview' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                {/* Quick Actions Bar */}
                                <div className={`rounded-xl border p-4 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Quick Actions</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {isAdmin && !client.is_4genetics_college && <button onClick={() => { if (onClose) onClose(); navigate('/invoices', { state: { openNewInvoice: true, preselectedClientId: client.id } }); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm"><Plus size={13} /> New Invoice</button>}
                                        <button onClick={() => navigate(`/new-ticket?clientId=${client.id}`)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm"><Ticket size={13} /> New Ticket</button>
                                        <a href={client.whatsapp_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"><MessageSquare size={13} /> WhatsApp</a>
                                        {isAdmin && <button onClick={() => setIsEditModalOpen(true)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ${isDark ? 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><Pencil size={13} /> Edit Client</button>}
                                    </div>
                                </div>

                                {/* General Notes */}
                                {(client.general_notes || isAdmin) && (
                                    <div className={`rounded-xl border p-5 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Notes</h3>
                                        <InlineEdit
                                            type="textarea"
                                            value={client.general_notes || ''}
                                            onSave={(newVal) => updateClientMutation.mutateAsync({ general_notes: newVal })}
                                            placeholder="Add notes..."
                                            className={`text-sm leading-relaxed whitespace-pre-wrap block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                                            disabled={!isAdmin}
                                        />
                                    </div>
                                )}

                                {/* Quick Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={`rounded-xl border p-5 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Client Information</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between group">
                                                <span className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Farm</span>
                                                <InlineEdit
                                                    value={client.farm_name}
                                                    onSave={(newVal) => updateClientMutation.mutateAsync({ farm_name: newVal })}
                                                    className={`w-full flex justify-end text-sm font-semibold pl-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                                                    disabled={!isAdmin}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between group">
                                                <span className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Area</span>
                                                <InlineEdit
                                                    value={client.area || ''}
                                                    onSave={(newVal) => updateClientMutation.mutateAsync({ area: newVal })}
                                                    className={`w-full flex justify-end text-sm font-semibold pl-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                                                    placeholder="—"
                                                    disabled={!isAdmin}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`rounded-xl border p-5 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Subscription Details</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between group">
                                                <span className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Serial Key</span>
                                                <InlineEdit
                                                    value={client.serial_number || ''}
                                                    onSave={(newVal) => updateClientMutation.mutateAsync({ serial_number: newVal })}
                                                    className={`w-full flex justify-end text-sm font-semibold pl-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                                                    placeholder="—"
                                                    disabled={!isAdmin}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between group">
                                                <span className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Start Date</span>
                                                <InlineEditDate
                                                    value={client.subscription_start_date || ''}
                                                    onSave={(newVal) => updateClientMutation.mutateAsync({ subscription_start_date: newVal })}
                                                    className={`w-full flex justify-end text-sm font-semibold pl-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                                                    disabled={!isAdmin}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between group">
                                                <span className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>End Date</span>
                                                <InlineEditDate
                                                    value={client.subscription_end_date || ''}
                                                    onSave={(newVal) => updateClientMutation.mutateAsync({ subscription_end_date: newVal })}
                                                    className={`w-full flex justify-end text-sm font-semibold pl-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                                                    disabled={!isAdmin}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Status</span>
                                                <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{status.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ FINANCE SECTION ═══ */}
                        {activeSection === 'finance' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                {/* Finance Summary */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Total Revenue', value: `${totalRevenue.toLocaleString()} €`, color: isDark ? 'text-gray-200' : 'text-gray-800' },
                                        { label: 'Collected', value: `${paidAmount.toLocaleString()} €`, color: 'text-green-500' },
                                        { label: 'Pending', value: `${totalDue.toLocaleString()} €`, color: totalDue > 0 ? 'text-orange-500' : isDark ? 'text-gray-400' : 'text-gray-600' },
                                    ].map((item, i) => (
                                        <div key={i} className={`rounded-xl border p-4 text-center ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{item.label}</p>
                                            <p className={`text-lg font-extrabold tabular-nums ${item.color}`}>{item.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Invoice List */}
                                <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                                    <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Invoice History</h3>
                                        {isAdmin && (
                                            <button onClick={() => { if (onClose) onClose(); navigate('/invoices', { state: { openNewInvoice: true, preselectedClientId: client.id } }); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm">
                                                <Plus size={12} /> New Invoice
                                            </button>
                                        )}
                                    </div>
                                    {invoices.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Receipt size={32} className={`mx-auto mb-2 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                            <p className={`text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>No invoices yet</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }}>
                                            {invoices.map(inv => (
                                                <div key={inv.id} className={`flex items-center justify-between p-4 hover:${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'} transition-colors`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${inv.status === 'Due' ? 'bg-orange-500/10' : 'bg-green-500/10'}`}>
                                                            <Receipt size={14} className={inv.status === 'Due' ? 'text-orange-500' : 'text-green-500'} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                {inv.invoice_type || 'Invoice'} #{inv.id}
                                                            </p>
                                                            <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-sm font-bold tabular-nums ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                            {parseFloat(inv.total_amount || 0).toLocaleString()} €
                                                        </span>
                                                        {isAdmin ? (
                                                            <select
                                                                value={inv.status}
                                                                onChange={(e) => updateInvoiceMutation.mutate({ id: inv.id, status: e.target.value })}
                                                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer ${inv.status === 'Due'
                                                                    ? isDark ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-700'
                                                                    : isDark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
                                                                    }`}
                                                            >
                                                                <option value="Due">Due</option>
                                                                <option value="Paid to Us">Paid to Us</option>
                                                                <option value="Paid to Uniform">Paid to Uniform</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${inv.status === 'Due'
                                                                ? isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-700'
                                                                : isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'
                                                                }`}>{inv.status}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══ CONTACTS SECTION ═══ */}
                        {activeSection === 'contacts' && (
                            <div className="space-y-4 animate-in fade-in duration-200">

                                {/* Other Contacts */}
                                <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                                    <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Additional Contacts ({contacts.length})</h3>
                                        {isAdmin && (
                                            <button onClick={() => setIsAddContactOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm">
                                                <Plus size={12} /> Add Contact
                                            </button>
                                        )}
                                    </div>
                                    {contacts.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Users size={32} className={`mx-auto mb-2 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                            <p className={`text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>No additional contacts</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }}>
                                            {contacts.map((contact, i) => (
                                                <div key={i} className={`flex items-center justify-between p-4 transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'}`}>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                            {getInitials(contact.name)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{contact.name}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-700'}`}>
                                                                    {contact.role || 'Contact'}
                                                                </span>
                                                                {contact.phone && <span className={`text-[11px] font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatPhone(contact.phone)}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {contact.phone && (
                                                            <a href={getWhatsAppLink(contact.phone)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors" title="WhatsApp">
                                                                <MessageSquare size={14} />
                                                            </a>
                                                        )}
                                                        {contact.phone && (
                                                            <button onClick={() => handleCopy(formatPhone(contact.phone), `phone-${i}`)} className={`p-2 rounded-lg transition-colors ${copiedField === `phone-${i}` ? 'text-green-500 bg-green-500/10' : isDark ? 'bg-white/[0.06] text-gray-500 hover:text-gray-300' : 'bg-gray-50 text-gray-400 hover:text-gray-600'}`} title="Copy number">
                                                                {copiedField === `phone-${i}` ? <CheckCircle size={14} /> : <Copy size={14} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══ TICKETS SECTION ═══ */}
                        {activeSection === 'tickets' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                                    <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Tickets ({tickets.length})</h3>
                                        <button onClick={() => navigate(`/new-ticket?clientId=${client.id}`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm"><Plus size={12} /> New Ticket</button>
                                    </div>
                                    {tickets.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Ticket size={32} className={`mx-auto mb-2 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                            <p className={`text-sm mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>No tickets for this client</p>
                                            <button onClick={() => navigate(`/new-ticket?clientId=${client.id}`)} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors">Create First Ticket</button>
                                        </div>
                                    ) : (
                                        <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }}>
                                            {tickets.map(ticket => (
                                                <div key={ticket.id}>
                                                    <div onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)} className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'}`}>
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ticket.status === 'Open' ? 'bg-amber-500/10' : ticket.status === 'In Progress' ? 'bg-blue-500/10' : ticket.status === 'Resolved' ? 'bg-green-500/10' : isDark ? 'bg-white/[0.04]' : 'bg-gray-100'
                                                                }`}>
                                                                <Ticket size={14} className={`${ticket.status === 'Open' ? 'text-amber-500' : ticket.status === 'In Progress' ? 'text-blue-500' : ticket.status === 'Resolved' ? 'text-green-500' : isDark ? 'text-gray-500' : 'text-gray-400'
                                                                    }`} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className={`text-sm font-semibold truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>#{ticket.id} — {ticket.category || ticket.title || ticket.subject}</p>
                                                                <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${ticket.status === 'Open'
                                                                ? isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'
                                                                : ticket.status === 'In Progress'
                                                                    ? isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'
                                                                    : ticket.status === 'Resolved'
                                                                        ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'
                                                                        : isDark ? 'bg-gray-500/10 text-gray-400' : 'bg-gray-100 text-gray-600'
                                                                }`}>{ticket.status}</span>
                                                            <ChevronRight size={14} className={`transition-transform ${expandedTicket === ticket.id ? 'rotate-90' : ''} ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                                                        </div>
                                                    </div>
                                                    {/* Expanded Ticket Detail */}
                                                    {expandedTicket === ticket.id && (
                                                        <div className={`px-4 pb-4 animate-in fade-in duration-200`}>
                                                            <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-gray-50 border border-gray-100'}`}>
                                                                {ticket.issue_description && (
                                                                    <div>
                                                                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Description</p>
                                                                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{ticket.issue_description}</p>
                                                                    </div>
                                                                )}
                                                                {ticket.resolution_notes && (
                                                                    <div>
                                                                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Resolution Notes</p>
                                                                        <p className={`text-sm ${isDark ? 'text-green-400/80' : 'text-green-700'}`}>{ticket.resolution_notes}</p>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-2 pt-1">
                                                                    <button onClick={() => navigate('/tickets')} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                                                        <span className="flex items-center gap-1"><ExternalLink size={11} /> View in Tickets</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══ FILES SECTION ═══ */}
                        {activeSection === 'files' && (
                            <div className="animate-in fade-in duration-200">
                                <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                                    <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Client Files</h3>
                                        {isAdmin && (
                                            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold cursor-pointer hover:bg-emerald-600 transition-colors shadow-sm">
                                                <Upload size={12} /> Upload File
                                                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { if (e.target.files[0]) openUploadModal(e.target.files[0], 'general'); }} />
                                            </label>
                                        )}
                                    </div>
                                    {generalFiles.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Paperclip size={32} className={`mx-auto mb-2 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                            <p className={`text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>No files uploaded</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }}>
                                            {generalFiles.map(file => (
                                                <div key={file.id} className={`p-4 ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'} transition-colors`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase ${getFileExtColor(file.original_name)}`}>
                                                                {file.original_name?.split('.').pop()}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{file.original_name}</p>
                                                                <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{formatFileSize(file.file_size)} • {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : ''}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <a href={file.file?.startsWith('http') ? file.file : `${API_BASE_URL.replace('/api', '')}${file.file}`} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                                                                <Download size={14} />
                                                            </a>
                                                            {isAdmin && (
                                                                <button onClick={() => handleFileDelete(file.id)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {(file.description || file.contact_person || file.file_date) && (
                                                        <div className={`mt-2 ml-11 flex flex-wrap gap-3 text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                            {file.description && <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{file.description}</span>}
                                                            {file.contact_person && <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>{file.contact_person}</span>}
                                                            {file.file_date && <span>{new Date(file.file_date).toLocaleDateString()}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══ WHATSAPP SECTION ═══ */}
                        {activeSection === 'whatsapp' && (
                            <div className="animate-in fade-in duration-200">
                                <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                                    <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>WhatsApp Screenshots</h3>
                                        {isAdmin && (
                                            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold cursor-pointer hover:bg-green-600 transition-colors shadow-sm">
                                                <Image size={12} /> Add Screenshot
                                                <input ref={whatsappInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) openUploadModal(e.target.files[0], 'whatsapp'); }} />
                                            </label>
                                        )}
                                    </div>

                                    {/* Drag & Drop Zone */}
                                    {isAdmin && (
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file?.type.startsWith('image/')) openUploadModal(file, 'whatsapp'); }}
                                            className={`mx-4 mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-all ${isDragging
                                                ? isDark ? 'border-green-500/50 bg-green-500/5' : 'border-green-400 bg-green-50'
                                                : isDark ? 'border-white/[0.08]' : 'border-gray-200'
                                                }`}
                                        >
                                            {isUploading ? (
                                                <Loader2 size={24} className="mx-auto text-green-500 animate-spin" />
                                            ) : (
                                                <>
                                                    <Upload size={24} className={`mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Drag & drop images here</p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Image Grid */}
                                    {whatsappFiles.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Image size={32} className={`mx-auto mb-2 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                            <p className={`text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>No screenshots</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                                            {whatsappFiles.map(file => {
                                                const imgUrl = file.file?.startsWith('http') ? file.file : `${API_BASE_URL.replace('/api', '')}${file.file}`;
                                                return (
                                                    <div key={file.id} className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer" onClick={() => setPreviewImage(imgUrl)}>
                                                        <img src={imgUrl} alt={file.original_name} className="w-full h-full object-cover" loading="lazy" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                                            <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                        {isAdmin && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleFileDelete(file.id); }} className="absolute top-2 right-2 p-1 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                        {(file.description || file.contact_person || file.file_date) && (
                                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                                                                {file.description && <p className="text-white text-[10px] truncate">{file.description}</p>}
                                                                <div className="flex gap-2 text-[9px] text-white/70">
                                                                    {file.contact_person && <span>{file.contact_person}</span>}
                                                                    {file.file_date && <span>{new Date(file.file_date).toLocaleDateString()}</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ IMAGE PREVIEW MODAL ═══ */}
            {
                previewImage && (
                    createPortal(
                        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                            <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
                                <X size={20} />
                            </button>
                            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
                        </div>,
                        document.body
                    )
                )
            }

            {/* ═══ MODALS ═══ */}
            {isEditModalOpen && <EditClientModal client={client} onClose={() => setIsEditModalOpen(false)} />}
            {isAddContactOpen && <AddContactModal clientId={client.id} clientName={client.name} onClose={() => setIsAddContactOpen(false)} />}

            {/* ═══ UPLOAD METADATA MODAL ═══ */}
            {
                uploadModal && (
                    createPortal(
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
                            <div className={`rounded-xl shadow-2xl w-full max-w-md ${isDark ? 'bg-gray-900/95 backdrop-blur-xl border border-white/[0.08]' : 'bg-white'}`}>
                                <div className={`p-5 border-b flex justify-between items-center ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>File Details</h2>
                                    <button onClick={() => setUploadModal(null)} className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div>
                                        <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>File: <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{uploadModal.file?.name}</span></p>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Description</label>
                                        <input type="text" value={uploadModal.description} onChange={(e) => setUploadModal(prev => ({ ...prev, description: e.target.value }))} placeholder="What is this file about?" className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600' : 'border-gray-300 bg-white placeholder-gray-400'}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Contact Person</label>
                                        <input type="text" value={uploadModal.contact_person} onChange={(e) => setUploadModal(prev => ({ ...prev, contact_person: e.target.value }))} placeholder="Who is this related to?" className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600' : 'border-gray-300 bg-white placeholder-gray-400'}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date</label>
                                        <input type="date" value={uploadModal.file_date} onChange={(e) => setUploadModal(prev => ({ ...prev, file_date: e.target.value }))} className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'border-gray-300 bg-white'}`} />
                                    </div>
                                </div>
                                <div className={`flex justify-end gap-3 p-5 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                                    <button onClick={() => setUploadModal(null)} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${isDark ? 'text-gray-400 hover:bg-white/[0.06]' : 'text-gray-500 hover:bg-gray-100'}`}>Cancel</button>
                                    <button onClick={submitUploadModal} disabled={isUploading} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                                        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        Upload
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )
                )
            }
        </div >
    );
}
