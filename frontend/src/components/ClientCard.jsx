import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Phone, MessageSquare, Pencil, Receipt, DollarSign, Clock,
    Trash2, Ticket, ChevronRight
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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const ref = useRef(null);

    const invoices = client.invoices || [];
    const totalDue = invoices.filter(inv => inv.status === 'Due').reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const tickets = client.tickets || [];
    const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;

    const getInitials = (name) => name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : '??';

    const getDaysRemaining = () => {
        if (!client.subscription_end_date) return null;
        return Math.ceil((new Date(client.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24));
    };
    const daysRemaining = getDaysRemaining();

    const getStatusInfo = () => {
        if (client.is_demo) return { label: 'Demo', color: isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' };
        if (daysRemaining !== null && daysRemaining < 0) return { label: 'Expired', color: isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-700', dot: 'bg-red-500' };
        if (isCritical) return { label: 'Expiring', color: isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700', dot: 'bg-amber-500 animate-pulse' };
        return { label: 'Active', color: isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-700', dot: 'bg-green-500' };
    };
    const status = getStatusInfo();

    const deleteClientMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`${API_BASE_URL}/clients/${id}/`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
        },
        onSuccess: () => queryClient.invalidateQueries(['clients']),
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
        setTilt({ x: (e.clientY - rect.top - rect.height / 2) / 35, y: (rect.width / 2 - (e.clientX - rect.left)) / 35 });
    };

    const goToDetail = () => navigate(`/clients/${client.id}`);

    const accentColor = isCritical ? (daysRemaining !== null && daysRemaining < 0 ? 'bg-red-500' : 'bg-amber-500') : 'bg-emerald-500';

    // ═══ LIST MODE ═══
    if (viewMode === 'list') {
        return (
            <>
                <div
                    onClick={goToDetail}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm cursor-pointer ${isCritical
                        ? isDark ? 'bg-red-950/10 border-red-900/30' : 'bg-red-50/30 border-red-200'
                        : isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-gray-100'
                        } hover:shadow-md group`}
                >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isCritical
                            ? isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-600'
                            : 'bg-gradient-to-br from-green-400 to-emerald-600 text-white'
                            }`}>{getInitials(client.farm_name)}</div>
                        <div className="min-w-0">
                            <h3 className={`font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{client.farm_name}</h3>
                            <div className="flex items-center gap-2">
                                <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{client.name}</p>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${status.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                        <div className="text-right hidden lg:block">
                            <p className={`text-[10px] font-medium uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Expires</p>
                            <p className={`text-sm font-semibold tabular-nums ${isCritical ? 'text-red-500' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>{client.subscription_end_date}</p>
                        </div>
                        {totalDue > 0 && (
                            <div className="text-right hidden md:block">
                                <p className="text-[10px] text-orange-500 font-bold uppercase">Due</p>
                                <p className="text-sm font-bold text-orange-600 tabular-nums">{totalDue.toLocaleString()} EGP</p>
                            </div>
                        )}
                        <ChevronRight size={16} className={isDark ? 'text-gray-600' : 'text-gray-300'} />
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
                className={`relative rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer group ${isCritical
                    ? isDark ? 'bg-gray-900 border-red-800/25' : 'bg-white border-red-200/50'
                    : isDark ? 'bg-gray-900 border-white/[0.08]' : 'bg-white border-gray-200/70'
                    }`}
                style={{
                    transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.02 : 1})`,
                    boxShadow: isHovered
                        ? isCritical
                            ? '0 20px 50px -10px rgba(239, 68, 68, 0.18)'
                            : '0 20px 50px -10px rgba(34, 197, 94, 0.15)'
                        : '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
                }}
            >
                {/* Accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor} z-20 rounded-l-2xl`} />

                {/* Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] pointer-events-none z-10" />

                {/* Progress bar */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] z-20 ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                    <div className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-1000 rounded-r-full`} style={{ width: `${progress}%` }} />
                </div>

                <div className="p-5 pl-6">
                    {/* Header */}
                    <div className="flex items-start gap-3.5">
                        <div className={`w-12 h-12 rounded-xl flex shrink-0 items-center justify-center font-bold text-sm shadow-lg ring-2 ring-offset-2 transition-all duration-300 ${isDark ? 'ring-offset-gray-900' : 'ring-offset-white'} ${isCritical
                            ? 'bg-gradient-to-br from-red-400 to-rose-600 text-white ring-red-200/50 dark:ring-red-800/30'
                            : 'bg-gradient-to-br from-emerald-400 to-green-600 text-white ring-emerald-200/50 dark:ring-emerald-800/30'
                            } ${isHovered ? 'shadow-xl scale-105' : ''}`}>
                            {getInitials(client.farm_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5">
                                <h3 className={`text-[15px] font-extrabold truncate leading-tight tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {client.farm_name}
                                </h3>
                                <span className={`inline-flex items-center gap-1.5 text-[9px] font-extrabold px-2.5 py-1 rounded-full shrink-0 uppercase tracking-widest shadow-sm ${status.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                                </span>
                            </div>
                            <p className={`text-[13px] truncate mt-1 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {client.name}
                            </p>
                        </div>
                        <div className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-gray-600 group-hover:text-gray-400' : 'text-gray-300 group-hover:text-gray-500'}`}>
                            <ChevronRight size={16} />
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div className="grid grid-cols-4 gap-2.5 mt-4">
                        {[
                            { icon: Clock, value: daysRemaining !== null ? (daysRemaining < 0 ? Math.abs(daysRemaining) : daysRemaining) : '—', label: daysRemaining !== null && daysRemaining < 0 ? 'Overdue' : 'Days', alert: daysRemaining !== null && daysRemaining < 0 ? 'red' : daysRemaining !== null && daysRemaining < 60 ? 'amber' : null },
                            { icon: Receipt, value: invoices.length, label: 'Invoices' },
                            { icon: DollarSign, value: totalDue > 0 ? `${(totalDue / 1000).toFixed(totalDue >= 1000 ? 0 : 1)}k` : '0', label: 'Due', alert: totalDue > 0 ? 'orange' : null },
                            { icon: Ticket, value: openTickets, label: 'Tickets', alert: openTickets > 0 ? 'blue' : null },
                        ].map((kpi, i) => {
                            const colorMap = { red: { bg: isDark ? 'bg-red-500/[0.08] border-red-500/10' : 'bg-red-50/80 border-red-100', icon: 'text-red-400', value: isDark ? 'text-red-400' : 'text-red-600' }, amber: { bg: isDark ? 'bg-amber-500/[0.08] border-amber-500/10' : 'bg-amber-50/80 border-amber-100', icon: 'text-amber-400', value: isDark ? 'text-amber-400' : 'text-amber-600' }, orange: { bg: isDark ? 'bg-orange-500/[0.08] border-orange-500/10' : 'bg-orange-50/80 border-orange-100', icon: 'text-orange-400', value: isDark ? 'text-orange-400' : 'text-orange-600' }, blue: { bg: isDark ? 'bg-blue-500/[0.08] border-blue-500/10' : 'bg-blue-50/80 border-blue-100', icon: 'text-blue-400', value: isDark ? 'text-blue-400' : 'text-blue-600' } };
                            const c = kpi.alert ? colorMap[kpi.alert] : { bg: isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-gray-50/80 border-gray-100', icon: 'text-gray-400', value: isDark ? 'text-gray-200' : 'text-gray-800' };
                            return (
                                <div key={i} className={`text-center px-2 py-2 rounded-xl border transition-colors ${c.bg}`}>
                                    <kpi.icon size={12} className={`mx-auto mb-1 ${c.icon}`} />
                                    <p className={`text-sm font-extrabold tabular-nums leading-none ${c.value}`}>{kpi.value}</p>
                                    <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{kpi.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }}>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <a href={client.whatsapp_link} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-lg transition-all hover:scale-110 ${isDark ? 'text-gray-500 hover:text-green-400 hover:bg-green-500/10' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}>
                                <MessageSquare size={14} />
                            </a>
                            <a href={`tel:${client.phone}`} className={`p-1.5 rounded-lg transition-all hover:scale-110 ${isDark ? 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}>
                                <Phone size={14} />
                            </a>
                            {isAdmin && (
                                <button onClick={() => setIsEditModalOpen(true)} className={`p-1.5 rounded-lg transition-all hover:scale-110 ${isDark ? 'text-gray-500 hover:text-purple-400 hover:bg-purple-500/10' : 'text-gray-400 hover:text-purple-500 hover:bg-purple-50'}`}>
                                    <Pencil size={14} />
                                </button>
                            )}
                        </div>
                        <span className={`text-[10px] font-medium ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            View Details →
                        </span>
                    </div>
                </div>
            </div>
            {isEditModalOpen && <EditClientModal client={client} onClose={() => setIsEditModalOpen(false)} />}
        </>
    );
}
