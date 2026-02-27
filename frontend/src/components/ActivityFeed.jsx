import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Users, FileText, Ticket, DollarSign, CheckCircle, Edit3,
    Barcode, Bell, Clock, Activity
} from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

const actionIcons = {
    client_created: { icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    client_updated: { icon: Edit3, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    invoice_created: { icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/15' },
    invoice_paid: { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/15' },
    ticket_created: { icon: Ticket, color: 'text-orange-400', bg: 'bg-orange-500/15' },
    ticket_resolved: { icon: CheckCircle, color: 'text-teal-400', bg: 'bg-teal-500/15' },
    payment_received: { icon: DollarSign, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
    serial_assigned: { icon: Barcode, color: 'text-pink-400', bg: 'bg-pink-500/15' },
    reminder_created: { icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/15' },
};

function getTimeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

export default function ActivityFeed() {
    const { data, isLoading } = useQuery({
        queryKey: ['activityLog'],
        queryFn: () => fetch(`${API_BASE_URL}/activity-log/?limit=15`).then(r => r.json()),
        refetchInterval: 60000,
    });

    const activities = data?.activities || [];

    return (
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                    <Activity size={16} className="text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white">Recent Activity</h3>
                    <p className="text-xs text-gray-500">Latest system events</p>
                </div>
            </div>

            {/* Timeline */}
            <div className="max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs text-gray-400 mt-2">Loading activity...</p>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="p-8 text-center">
                        <Clock size={24} className="mx-auto mb-2 text-gray-600" />
                        <p className="text-sm text-gray-400">No activity yet</p>
                        <p className="text-xs text-gray-500 mt-1">Actions will appear here as you use the system</p>
                    </div>
                ) : (
                    <div className="py-2">
                        {activities.map((activity, idx) => {
                            const config = actionIcons[activity.action] || actionIcons.client_created;
                            const Icon = config.icon;
                            const isLast = idx === activities.length - 1;
                            return (
                                <div key={activity.id} className="relative flex items-start gap-3 px-5 py-3 group hover:bg-white/[0.02] transition-colors activity-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                    {/* Timeline line */}
                                    {!isLast && (
                                        <div className="absolute left-[33px] top-[44px] bottom-0 w-[1px] bg-white/5" />
                                    )}

                                    {/* Icon */}
                                    <div className={`flex-shrink-0 p-2 rounded-xl ${config.bg} z-10`}>
                                        <Icon size={14} className={config.color} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-300 leading-relaxed">{activity.description}</p>
                                        <span className="text-[10px] text-gray-500 mt-0.5 block">{getTimeAgo(activity.created_at)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
