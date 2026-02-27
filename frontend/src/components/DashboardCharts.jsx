import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Table2, RefreshCw, Calendar, DollarSign, Activity } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

const fetchChartData = async () => {
    const response = await fetch(`${API_BASE_URL}/chart-data/`);
    if (!response.ok) throw new Error('Failed to fetch chart data');
    return response.json();
};

// Color palette
const COLORS = {
    primary: '#22c55e',
    secondary: '#3b82f6',
    accent: '#8b5cf6',
    warning: '#f59e0b',
    danger: '#ef4444',
    dark: '#111827',
    gray: '#6b7280'
};

const STATUS_COLORS = {
    'Open': '#ef4444',
    'In Progress': '#f59e0b',
    'Resolved': '#22c55e',
    'Closed': '#6b7280',
    'Due': '#ef4444',
    'Paid to Us': '#22c55e',
    'Paid to Uniform': '#3b82f6'
};

// Chart Card wrapper with Glassmorphism
const ChartCard = ({ title, icon: Icon, children, className = '' }) => (
    <div className={`bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl p-6 border border-gray-100 dark:border-white/[0.06] hover:shadow-2xl transition-all duration-300 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-green-50 to-blue-50 dark:from-white/[0.06] dark:to-white/[0.04] rounded-xl">
                <Icon size={20} className="text-gray-700 dark:text-gray-200" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">{title}</h3>
        </div>
        {children}
    </div>
);

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-gray-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 text-sm">
            <p className="font-bold mb-1 opacity-80">{label}</p>
            {payload.map((entry, i) => (
                <p key={i} className="flex items-center gap-2 font-medium" style={{ color: entry.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                </p>
            ))}
        </div>
    );
};

// Ticket Trend Chart
const TicketTrendChart = ({ data }) => {
    if (!data?.length) {
        return <p className="text-gray-400 text-center py-8">No ticket data available</p>;
    }
    return (
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: COLORS.primary, strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                    type="monotone"
                    dataKey="count"
                    name="Tickets"
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    fill="url(#ticketGradient)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

// Revenue Chart
const RevenueChart = ({ data }) => {
    if (!data?.length) {
        return <p className="text-gray-400 text-center py-8">No revenue data available</p>;
    }
    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
                <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.secondary} stopOpacity={1} />
                        <stop offset="100%" stopColor={COLORS.secondary} stopOpacity={0.6} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.4 }} />
                <Bar dataKey="revenue" name="Revenue" fill="url(#revenueGradient)" radius={[8, 8, 0, 0]} barSize={40} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// Quarterly Dues Chart (New)
const QuarterlyChart = ({ data }) => {
    if (!data?.length) {
        return <p className="text-gray-400 text-center py-8">No forecast data available</p>;
    }
    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
                <defs>
                    <linearGradient id="duesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.accent} stopOpacity={1} />
                        <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.6} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.4 }} />
                <Bar dataKey="value" name="Projected Uniform Dues" fill="url(#duesGradient)" radius={[8, 8, 0, 0]} barSize={50}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.accent} opacity={0.8 + (index * 0.05)} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// Pie Chart for Status Distribution
const StatusPieChart = ({ data, title }) => {
    if (!data?.length) {
        return <p className="text-gray-400 text-center py-8">No data available</p>;
    }

    const chartData = data.map(item => ({
        name: item.status || item.category || item.name,
        value: item.count || item.value,
        color: STATUS_COLORS[item.status || item.category] || item.color || COLORS.gray
    }));

    return (
        <ResponsiveContainer width="100%" height={220}>
            <PieChart>
                <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                >
                    {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{value}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

// Data Table Component
const DataTable = ({ data, columns, emptyMessage = "No data available" }) => {
    if (!data?.length) {
        return <p className="text-gray-400 text-center py-8 opacity-60">{emptyMessage}</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                        {columns.map((col, i) => (
                            <th key={i} className="px-4 py-3 text-left text-gray-500 font-semibold tracking-wide uppercase text-xs">
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {data.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                            {columns.map((col, j) => (
                                <td key={j} className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Status Badge
const StatusBadge = ({ status }) => {
    const colors = {
        'Open': 'bg-red-500/15 text-red-400 border-red-500/20',
        'In Progress': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        'Resolved': 'bg-green-500/15 text-green-400 border-green-500/20',
        'Closed': 'bg-gray-500/15 text-gray-400 border-gray-500/20',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${colors[status] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'}`}>
            {status}
        </span>
    );
};

// Days Left Badge
const DaysLeftBadge = ({ days }) => {
    let colorClass = 'bg-green-500/15 text-green-400 border-green-500/20';
    if (days <= 7) colorClass = 'bg-red-500/15 text-red-400 border-red-500/20';
    else if (days <= 30) colorClass = 'bg-amber-500/15 text-amber-400 border-amber-500/20';

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
            {days} days
        </span>
    );
};

// Main Dashboard Charts Component
export default function DashboardCharts() {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['chartData'],
        queryFn: fetchChartData,
        refetchInterval: 60000, // Refresh every minute
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white/50 dark:bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-gray-100 dark:border-white/[0.06] animate-pulse">
                        <div className="h-6 bg-gray-200/50 dark:bg-white/[0.06] rounded w-1/3 mb-6" />
                        <div className="h-56 bg-gray-100/50 dark:bg-white/[0.04] rounded-xl" />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50/50 dark:bg-red-500/10 backdrop-blur border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 p-8 rounded-2xl text-center">
                <p className="font-semibold mb-2">Unavailable</p>
                <button onClick={() => refetch()} className="text-sm underline hover:text-red-800 dark:hover:text-red-300">Retry Connection</button>
            </div>
        );
    }

    const ticketColumns = [
        { key: 'client', header: 'Farm' },
        { key: 'category', header: 'Category' },
        { key: 'status', header: 'Status', render: (v) => <StatusBadge status={v} /> },
        { key: 'date', header: 'Date' },
    ];

    const renewalColumns = [
        { key: 'farm', header: 'Farm' },
        { key: 'contact', header: 'Contact' },
        { key: 'end_date', header: 'End Date' },
        { key: 'days_left', header: 'Time Remaining', render: (v) => <DaysLeftBadge days={v} /> },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Activity className="text-green-500" size={28} />
                        Advanced Analytics Impl.
                    </h2>
                    <p className="text-gray-500 mt-1 dark:text-gray-400">Quarterly forecasts and operational intelligence</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.1] rounded-xl transition-all"
                >
                    <RefreshCw size={16} />
                    Refresh Data
                </button>
            </div>

            {/* Financial Intelligence - Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartCard title="Total Uniform Dues (Quarterly Forecast)" icon={DollarSign} className="border-l-4 border-l-purple-500">
                    <QuarterlyChart data={data?.quarterly_dues} />
                </ChartCard>

                <ChartCard title="Monthly Revenue Stream" icon={BarChart3} className="border-l-4 border-l-blue-500">
                    <RevenueChart data={data?.invoice_trend} />
                </ChartCard>
            </div>

            {/* Operational Intelligence - Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartCard title="Ticket Volume Trend" icon={TrendingUp}>
                    <TicketTrendChart data={data?.ticket_trend} />
                </ChartCard>

                <ChartCard title="Subscription Health Index" icon={PieChartIcon}>
                    <StatusPieChart data={data?.subscription_health} />
                </ChartCard>
            </div>

            {/* Distribution - Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ChartCard title="Ticket Status Distribution" icon={PieChartIcon}>
                    <StatusPieChart data={data?.ticket_status} />
                </ChartCard>

                <ChartCard title="Support Categories" icon={PieChartIcon}>
                    <StatusPieChart data={data?.ticket_categories} />
                </ChartCard>
            </div>

            {/* Data Tables Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <ChartCard title="Recent Support Tickets" icon={Table2} className="overflow-hidden">
                    <DataTable
                        data={data?.tickets_table}
                        columns={ticketColumns}
                        emptyMessage="No recent tickets found"
                    />
                </ChartCard>

                <ChartCard title="Upcoming Subscription Renewals" icon={Calendar} className="overflow-hidden">
                    <DataTable
                        data={data?.renewals_table}
                        columns={renewalColumns}
                        emptyMessage="No subscriptions expiring soon"
                    />
                </ChartCard>
            </div>
        </div>
    );
}
