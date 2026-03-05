import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import ClientCard from '../components/ClientCard';
import DashboardCharts from '../components/DashboardCharts';
import ActivityFeed from '../components/ActivityFeed';
import NotificationCenter from '../components/NotificationCenter';
import StatCard from '../components/StatCard';
import {
    Search, Loader2, Users, AlertTriangle, FileText, Ticket,
    TrendingUp, Clock, CheckCircle, XCircle, ArrowRight, Calendar,
    DollarSign, Activity, Sparkles, AlertCircle, Moon, Barcode, Play, Timer, Zap, Sun,
    Shield, Target, Gauge, Flame
} from 'lucide-react';
import { useSleepMode } from '../App';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

const fetchClients = async () => {
    const response = await fetch(`${API_BASE_URL}/clients/`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

const fetchDashboardStats = async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard-stats/`);
    if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
    }
    return response.json();
};


export default function Dashboard() {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [showClients, setShowClients] = React.useState(false);

    const { data: clients, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: fetchClients,
    });

    const { data: stats, isLoading: statsLoading, isError } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: fetchDashboardStats,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    const filteredClients = clients?.filter(client =>
        !client.is_4genetics_college &&
        (client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.farm_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (statsLoading || clientsLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-500 mb-2">Error Loading Dashboard</h3>
                <p className="text-gray-400">Failed to fetch dashboard statistics</p>
            </div>
        );
    }

    return (
        <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4 space-y-5 md:space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <span className="relative">
                            <Sparkles className="text-amber-500" size={26} />
                            <span className="absolute inset-0 text-amber-400/40 blur-md">
                                <Sparkles size={26} />
                            </span>
                        </span>
                        Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Your Uniform Agri system at a glance
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => navigate('/clients?new=true')} className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm md:text-base font-medium transition-colors shadow-sm shadow-green-500/20">
                        <Users size={18} />
                        <span>New Client</span>
                    </button>
                    <button onClick={() => navigate('/tickets?new=true')} className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm md:text-base font-medium transition-colors shadow-sm">
                        <Ticket size={18} />
                        <span>Log Ticket</span>
                    </button>
                    <button onClick={() => navigate('/invoices?new=true')} className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm md:text-base font-medium transition-colors shadow-sm">
                        <FileText size={18} />
                        <span>Invoice</span>
                    </button>
                </div>
            </div>

            {/* KPI Row (Elevated to top for prominence) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <StatCard
                    icon={AlertTriangle}
                    label="Expiring Soon"
                    value={stats?.clients?.expiring_soon || 0}
                    subValue="Within 60 days"
                    color="orange"
                    to="/stats/expiring-soon"
                    delay={0}
                    info="Number of client subscriptions that will expire in the next 60 days. Follow up with these clients to renew their contracts."
                />
                <StatCard
                    icon={FileText}
                    label="Due Invoices"
                    value={stats?.invoices?.due || 0}
                    subValue={`${stats?.invoices?.total || 0} total invoices`}
                    color="blue"
                    to="/stats/due-invoices"
                />
                <StatCard
                    icon={Ticket}
                    label="Open Tickets"
                    value={stats?.tickets?.open || 0}
                    subValue={`+${stats?.tickets?.new_this_week || 0} this week`}
                    color="red"
                    to="/stats/open-tickets"
                    delay={200}
                    info="Support tickets that are still open and waiting to be resolved. These need your attention to keep clients happy."
                />
                <StatCard
                    icon={Users}
                    label="Total Farms"
                    value={stats?.clients?.total || 0}
                    subValue={`+${stats?.clients?.new_this_week || 0} this week`}
                    trend="up"
                    color="green"
                    to="/stats/total-farms"
                    delay={300}
                    info="The total number of farms registered in your system. This includes all active, expired, and demo clients."
                />
            </div>

            {/* Stats Grid - Row 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <StatCard
                    icon={Shield}
                    label="Retention Rate"
                    value={`${stats?.kpis?.retention_rate || 0}%`}
                    subValue={`${stats?.clients?.active || 0} active farms`}
                    color={stats?.kpis?.retention_rate >= 80 ? 'green' : stats?.kpis?.retention_rate >= 60 ? 'orange' : 'red'}
                    to="/stats/retention-rate"
                    delay={0}
                    info="Percentage of clients who renewed their subscription. A high rate means clients are satisfied and staying with you."
                />
                <StatCard
                    icon={Target}
                    label="Collection Rate"
                    value={`${stats?.kpis?.collection_rate || 0}%`}
                    subValue="Paid vs invoiced"
                    color={stats?.kpis?.collection_rate >= 70 ? 'green' : stats?.kpis?.collection_rate >= 40 ? 'orange' : 'red'}
                    to="/stats/collection-rate"
                    delay={100}
                    info="How much money you've actually collected compared to what you've invoiced. Higher is better — it means clients are paying on time."
                />
                <StatCard
                    icon={Gauge}
                    label="SLA Adherence"
                    value={`${stats?.kpis?.sla_adherence || 0}%`}
                    subValue="Resolved within 48h"
                    color={stats?.kpis?.sla_adherence >= 80 ? 'green' : stats?.kpis?.sla_adherence >= 50 ? 'orange' : 'red'}
                    to="/stats/sla-adherence"
                    delay={200}
                    info="Percentage of support tickets resolved within 48 hours. This measures how fast your team responds to client issues."
                />
                <StatCard
                    icon={DollarSign}
                    label="Revenue / Client"
                    value={`${(stats?.kpis?.revenue_per_client || 0).toLocaleString()} EGP`}
                    subValue="Per active farm"
                    color="cyan"
                    to="/stats/revenue-per-client"
                    delay={300}
                    info="Average revenue earned from each active client. Helps you understand how much each farm is worth to your business."
                />
            </div>

            {/* Stats Grid - Row 2 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <StatCard
                    icon={Barcode}
                    label="4Genetics Serials"
                    value={stats?.serials?.active || 0}
                    subValue={`${stats?.serials?.unassigned || 0} unassigned`}
                    color="cyan"
                    to="/stats/serials"
                    delay={400}
                    info="Active 4Genetics serial numbers in your system. Serials are assigned to clients for software licensing."
                />
                <StatCard
                    icon={Play}
                    label="Farms in Demo"
                    value={stats?.clients?.demo_farms || 0}
                    subValue={stats?.clients?.demo_expiring_soon > 0 ? `${stats.clients.demo_expiring_soon} expiring soon` : 'All active'}
                    color="purple"
                    to="/stats/demo-farms"
                    delay={500}
                    info="Clients currently on a free trial/demo period. These are potential paying customers you should follow up with."
                />
                <StatCard
                    icon={Timer}
                    label="Avg Response Time"
                    value={stats?.tickets?.avg_resolution_hours ? `${stats.tickets.avg_resolution_hours}h` : 'N/A'}
                    subValue="Ticket resolution"
                    color="blue"
                    to="/stats/avg-response-time"
                    info="The average number of hours it takes to resolve a support ticket. Lower is better — aim for quick turnaround."
                />
                <StatCard
                    icon={Zap}
                    label="Active This Month"
                    value={stats?.clients?.active_this_month || 0}
                    subValue="Last 30 days"
                    trend="up"
                    color="green"
                    to="/stats/active-this-month"
                    delay={700}
                    info="Clients who had any activity (tickets, invoices, or interactions) in the last 30 days."
                />
            </div>

            {/* Stats Grid - Row 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Flame}
                    label="Hot Leads"
                    value={stats?.clients?.hot_leads || 0}
                    color="orange"
                    to="/stats/hot-leads"
                    delay={800}
                    info="Clients whose subscriptions are about to expire and need urgent follow-up. These are your best renewal opportunities."
                />
                <StatCard
                    icon={XCircle}
                    label="Expired Subscriptions"
                    value={stats?.clients?.expired || 0}
                    color="red"
                    to="/stats/expired-subscriptions"
                    delay={900}
                    info="Clients whose subscriptions have already expired. Reach out to re-engage them and offer renewal deals."
                />
                <StatCard
                    icon={CheckCircle}
                    label="Resolved Tickets"
                    value={stats?.tickets?.resolved || 0}
                    color="green"
                    to="/stats/resolved-tickets"
                    delay={1000}
                    info="Total number of support tickets that have been successfully resolved. A high count shows good customer support."
                />
                <StatCard
                    icon={Clock}
                    label="In Progress"
                    value={stats?.tickets?.in_progress || 0}
                    color="orange"
                    to="/stats/in-progress"
                    delay={1100}
                    info="Support tickets currently being worked on by the team. These are actively being addressed."
                />
                <StatCard
                    icon={DollarSign}
                    label="Total Revenue"
                    value={`${(stats?.invoices?.total_revenue || 0).toLocaleString()} EGP`}
                    subValue="Paid invoices"
                    color="cyan"
                    to="/stats/total-revenue"
                    delay={1100}
                    info="Total money collected from all paid invoices. This is your actual received revenue, not including unpaid invoices."
                />
            </div>


            {/* Health Summary Bar */}
            <div className={`rounded-xl md:rounded-2xl border p-3 md:p-5 ${isDark ? 'bg-gradient-to-r from-white/[0.03] to-white/[0.01] border-white/[0.06]' : 'bg-gradient-to-r from-gray-50 to-white border-gray-200 shadow-sm'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                            <Activity size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">System Health</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Real-time business metrics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 md:gap-6 flex-wrap">
                        {[
                            { label: 'Retention', value: stats?.kpis?.retention_rate, threshold: [80, 60] },
                            { label: 'Collection', value: stats?.kpis?.collection_rate, threshold: [70, 40] },
                            { label: 'SLA', value: stats?.kpis?.sla_adherence, threshold: [80, 50] },
                        ].map(metric => {
                            const v = metric.value || 0;
                            const dotColor = v >= metric.threshold[0] ? 'bg-emerald-500 shadow-emerald-500/50' : v >= metric.threshold[1] ? 'bg-amber-500 shadow-amber-500/50' : 'bg-red-500 shadow-red-500/50';
                            return (
                                <div key={metric.label} className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-lg`} />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</span>
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{v}%</span>
                                </div>
                            );
                        })}
                        <div className={`border-l pl-4 flex items-center gap-2 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <Flame size={14} className="text-orange-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Burn</span>
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-300">{(stats?.kpis?.monthly_burn_rate || 0).toLocaleString()} EGP</span>
                        </div>
                        {stats?.kpis?.avg_ticket_age_days != null && (
                            <div className={`border-l pl-4 flex items-center gap-2 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                <Clock size={14} className="text-blue-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">Avg Ticket</span>
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-300">{stats.kpis.avg_ticket_age_days}d</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Analytics Charts & Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
                <div className="lg:col-span-2">
                    <DashboardCharts />
                </div>
                <div className="lg:col-span-1">
                    <ActivityFeed />
                </div>
            </div>

            {/* Clients Grid (Toggle) */}
            {showClients && (
                <div className="animate-slide-up">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">All Clients</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {filteredClients?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
                            {filteredClients.map((client) => (
                                <ClientCard key={client.id} client={client} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-500">No clients found matching your search.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
