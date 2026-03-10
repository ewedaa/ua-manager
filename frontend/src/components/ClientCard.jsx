import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageSquare, Pencil, Clock,
    ChevronRight, ArrowUpRight
} from 'lucide-react';
import EditClientModal from './EditClientModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

export default function ClientCard({ client, viewMode = 'grid' }) {
    const { isAdmin } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isCritical = client.alert_status === 'critical';
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const ref = useRef(null);

    const invoices = client.invoices || [];
    const financialInvoices = invoices.filter(inv => !inv.invoice_type?.toLowerCase().includes('quotation'));
    const totalDue = financialInvoices.filter(inv => inv.status === 'Due').reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const tickets = client.tickets || [];
    const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;

    const getInitials = (name) => name && name !== '-' ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : '??';

    const getDaysRemaining = () => {
        if (!client.subscription_end_date) return null;
        return Math.ceil((new Date(client.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24));
    };
    const daysRemaining = getDaysRemaining();

    const getStatusInfo = () => {
        if (client.is_quoted) return { label: 'QUOTED', gradient: 'from-amber-400 to-orange-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50', text: isDark ? 'text-amber-400' : 'text-amber-700', dot: 'bg-amber-500' };
        if (client.is_demo) return { label: 'DEMO', gradient: 'from-purple-500 to-violet-600', bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50', text: isDark ? 'text-purple-400' : 'text-purple-700', dot: 'bg-purple-500' };
        if (daysRemaining !== null && daysRemaining < 0) return { label: 'EXPIRED', gradient: 'from-red-500 to-rose-600', bg: isDark ? 'bg-red-500/10' : 'bg-red-50', text: isDark ? 'text-red-400' : 'text-red-700', dot: 'bg-red-500' };
        if (isCritical) return { label: 'EXPIRING', gradient: 'from-amber-500 to-orange-600', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50', text: isDark ? 'text-amber-400' : 'text-amber-700', dot: 'bg-amber-500 animate-pulse' };
        return { label: 'ACTIVE', gradient: 'from-green-500 to-emerald-600', bg: isDark ? 'bg-green-500/10' : 'bg-green-50', text: isDark ? 'text-green-400' : 'text-green-700', dot: 'bg-green-500' };
    };
    const status = getStatusInfo();

    const categoryUpdateMutation = useMutation({
        mutationFn: async (newCategory) => {
            const is_demo = newCategory === 'demo';
            const is_quoted = newCategory === 'quoted';
            const payload = { is_demo, is_quoted };

            const res = await fetch(`${API_BASE_URL}/clients/${client.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Failed to update category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clients']);
        },
    });

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

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        setTilt({ x: (e.clientY - rect.top - rect.height / 2) / 40, y: (rect.width / 2 - (e.clientX - rect.left)) / 40 });
    };

    const goToDetail = () => navigate(`/clients/${client.id}`);

    // ═══ LIST MODE ═══
    if (viewMode === 'list') {
        return (
            <>
                <div
                    onClick={goToDetail}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer group ${isDark
                        ? `bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]`
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-gradient-to-br ${status.gradient} text-white shadow-lg`}>
                            {getInitials(client.farm_name)}
                        </div>
                        <div className="min-w-0">
                            <h3 className={`font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{client.farm_name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full tracking-widest ${status.bg} ${status.text}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                                </span>
                                {client.livestock_type && (
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full tracking-widest ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                                        {client.livestock_type}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-5 shrink-0">
                        {daysRemaining !== null && (
                            <div className="text-right hidden lg:block">
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Days Left</p>
                                <p className={`text-sm font-bold tabular-nums ${daysRemaining < 0 ? 'text-red-500' : daysRemaining < 30 ? 'text-amber-500' : isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                    {daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : daysRemaining}
                                </p>
                            </div>
                        )}
                        {totalDue > 0 && (
                            <div className="text-right hidden md:block">
                                <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">Due</p>
                                <p className="text-sm font-bold text-orange-500 tabular-nums">{totalDue.toLocaleString()} €</p>
                            </div>
                        )}
                        <div className={`p-1.5 rounded-lg transition-all group-hover:translate-x-0.5 ${isDark ? 'text-gray-600 group-hover:text-emerald-400' : 'text-gray-300 group-hover:text-emerald-500'}`}>
                            <ChevronRight size={18} />
                        </div>
                    </div>
                </div>
                {isEditModalOpen && <EditClientModal client={client} onClose={() => setIsEditModalOpen(false)} />}
            </>
        );
    }

    // ═══ GRID MODE ═══
    return (
        <>
            <div
                ref={ref}
                onClick={goToDetail}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setIsHovered(false); }}
                className={`relative rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer group ${isDark
                    ? 'bg-gray-900 border-white/[0.06] hover:border-white/[0.12]'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                style={{
                    transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.02 : 1})`,
                    boxShadow: isHovered
                        ? isCritical
                            ? '0 25px 60px -12px rgba(239, 68, 68, 0.2), 0 0 0 1px rgba(239, 68, 68, 0.05)'
                            : '0 25px 60px -12px rgba(34, 197, 94, 0.2), 0 0 0 1px rgba(34, 197, 94, 0.05)'
                        : isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'transform 0.2s ease-out, box-shadow 0.3s ease',
                }}
            >
                {/* Top gradient accent */}
                <div className={`h-1 bg-gradient-to-r ${status.gradient}`} />

                {/* Shimmer on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1500ms] pointer-events-none" />

                <div className="p-5">
                    {/* ═══ HEADER ROW ═══ */}
                    <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex shrink-0 items-center justify-center font-bold text-base shadow-xl bg-gradient-to-br ${status.gradient} text-white transition-transform duration-300 ${isHovered ? 'scale-105' : ''}`}>
                            {getInitials(client.farm_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className={`text-base font-extrabold leading-tight tracking-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {client.farm_name}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full tracking-widest ${status.bg} ${status.text}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                    {status.label}
                                </span>
                                {client.livestock_type && (
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full tracking-widest ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                                        {client.livestock_type}
                                    </span>
                                )}
                                {client.area && (
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full tracking-widest ${isDark ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-700'}`}>
                                        {client.area}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ═══ SUBSCRIPTION PROGRESS ═══ */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Subscription</span>
                            <span className={`text-[10px] font-bold tabular-nums ${daysRemaining !== null && daysRemaining < 0 ? 'text-red-500' : daysRemaining !== null && daysRemaining < 30 ? 'text-amber-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {daysRemaining !== null ? (daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`) : '—'}
                            </span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                            <div className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    {/* ═══ STATS ROW ═══ */}
                    <div className={`grid grid-cols-3 gap-3 mt-4 pt-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                        <div className="text-center">
                            <p className={`text-lg font-extrabold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>{financialInvoices.length}</p>
                            <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Invoices</p>
                        </div>
                        <div className="text-center">
                            <p className={`text-lg font-extrabold tabular-nums ${totalDue > 0 ? 'text-orange-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
                                {totalDue > 0 ? `${(totalDue / 1000).toFixed(totalDue >= 1000 ? 0 : 1)}k` : '0'}
                            </p>
                            <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${totalDue > 0 ? 'text-orange-400' : isDark ? 'text-gray-600' : 'text-gray-400'}`}>Due</p>
                        </div>
                        <div className="text-center">
                            <p className={`text-lg font-extrabold tabular-nums ${openTickets > 0 ? isDark ? 'text-blue-400' : 'text-blue-600' : isDark ? 'text-white' : 'text-gray-900'}`}>{openTickets}</p>
                            <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Tickets</p>
                        </div>
                    </div>

                    {/* ═══ BOTTOM ACTION BAR ═══ */}
                    <div className={`flex items-center justify-between mt-4 pt-3 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <a href={client.whatsapp_link} target="_blank" rel="noopener noreferrer"
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${isDark ? 'text-gray-500 hover:text-green-400 hover:bg-green-500/10' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                                title="WhatsApp">
                                <MessageSquare size={15} />
                            </a>
                            {isAdmin && (
                                <button onClick={() => setIsEditModalOpen(true)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${isDark ? 'text-gray-500 hover:text-purple-400 hover:bg-purple-500/10' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}
                                    title="Edit">
                                    <Pencil size={15} />
                                </button>
                            )}
                            {isAdmin && (
                                <div className="relative flex items-center" onClick={e => e.stopPropagation()}>
                                    {categoryUpdateMutation.isPending ? (
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            <Clock size={15} className="animate-spin" />
                                        </div>
                                    ) : (
                                        <select
                                            value={client.is_demo ? 'demo' : (client.is_quoted ? 'quoted' : 'active')}
                                            onChange={(e) => {
                                                if (window.confirm(`Transfer ${client.farm_name} to ${e.target.options[e.target.selectedIndex].text}?`)) {
                                                    categoryUpdateMutation.mutate(e.target.value);
                                                }
                                            }}
                                            className={`appearance-none bg-transparent outline-none cursor-pointer text-xs font-semibold px-2 py-1 flex items-center justify-center rounded-lg transition-all ${isDark ? 'text-gray-500 hover:text-green-400 hover:bg-green-500/10' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                                            title="Transfer Category"
                                            style={{ textAlignLast: 'center' }}
                                        >
                                            <option value="active">Active</option>
                                            <option value="demo">Demo</option>
                                            <option value="quoted">Quoted</option>
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-semibold transition-all duration-200 group-hover:translate-x-0.5 ${isDark ? 'text-gray-600 group-hover:text-emerald-400' : 'text-gray-400 group-hover:text-emerald-600'}`}>
                            Open <ArrowUpRight size={13} />
                        </div>
                    </div>
                </div>
            </div>
            {isEditModalOpen && <EditClientModal client={client} onClose={() => setIsEditModalOpen(false)} />}
        </>
    );
}
