import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Loader2, AlertCircle, Trash2, Edit2, ExternalLink,
    AlertTriangle, FileText, Ticket, Users, Shield, Target, Gauge,
    DollarSign, Barcode, Play, Timer, Zap, Info, CheckCircle, Clock,
    RefreshCw, Flame, XCircle, Plus
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

// ─── Tile config registry ────────────────────────────────────
const TILE_CONFIG = {
    'expiring-soon': {
        label: 'Expiring Soon',
        icon: AlertTriangle,
        color: 'orange',
        description: 'These are client subscriptions set to expire within the next 60 days. You should proactively contact each farm to discuss renewal, pricing, and whether they need any additional modules.',
        tip: 'Following up with clients 30+ days before expiry significantly improves renewal rates.',
        quickAction: { label: 'New Client', to: '/clients' },
        fetchKey: 'clients',
        fetchUrl: `${API_BASE_URL}/clients/`,
        filter: (items) => items.filter(c => {
            if (!c.subscription_end) return false;
            const diff = (new Date(c.subscription_end) - new Date()) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 60;
        }),
        columns: ['Farm Name', 'Contact', 'Expires', 'Status'],
        getRow: (c) => ({
            id: c.id,
            cells: [c.farm_name, c.name, c.subscription_end || 'N/A', c.status || 'Active'],
            link: `/clients/${c.id}`,
            deleteUrl: `${API_BASE_URL}/clients/${c.id}/`,
        }),
        resourceName: 'client',
        editRoute: (id) => `/clients/${id}`,
    },
    'due-invoices': {
        label: 'Due Invoices',
        icon: FileText,
        color: 'blue',
        description: 'These invoices have been issued but not yet paid. Keeping this list small is important for your cash flow. Review each invoice and follow up with the client if payment is overdue.',
        tip: 'Mark invoices as "Paid to Us" once you receive payment to keep your records accurate.',
        quickAction: { label: 'New Invoice', to: '/invoices' },
        fetchKey: 'invoices',
        fetchUrl: `${API_BASE_URL}/invoices/`,
        filter: (items) => items.filter(i => i.status === 'Due'),
        columns: ['Client', 'Type', 'Amount', 'Created'],
        getRow: (inv) => ({
            id: inv.id,
            cells: [
                inv.client_name || `Client #${inv.client}`,
                inv.invoice_type,
                `${parseFloat(inv.customer_total || inv.total_amount || 0).toLocaleString()} ${inv.currency || 'EGP'}`,
                new Date(inv.created_at).toLocaleDateString(),
            ],
            link: '/invoices',
            deleteUrl: `${API_BASE_URL}/invoices/${inv.id}/`,
        }),
        resourceName: 'invoice',
        editRoute: null,
    },
    'open-tickets': {
        label: 'Open Tickets',
        icon: Ticket,
        color: 'red',
        description: 'Open support tickets that still need resolution. Each unresolved ticket represents a client who is waiting for help. Prioritise by urgency and SLA deadlines.',
        tip: 'Resolve tickets within 48 hours to maintain a 100% SLA adherence score.',
        quickAction: { label: 'New Ticket', to: '/new-ticket' },
        fetchKey: 'tickets',
        fetchUrl: `${API_BASE_URL}/tickets/`,
        filter: (items) => items.filter(t => t.status !== 'Closed'),
        columns: ['Title', 'Client', 'Priority', 'Opened'],
        getRow: (t) => ({
            id: t.id,
            cells: [
                t.title || t.description?.slice(0, 40) + '...' || 'Untitled',
                t.client_name || `Client #${t.client}`,
                t.priority || 'Normal',
                new Date(t.created_at).toLocaleDateString(),
            ],
            link: '/tickets',
            deleteUrl: `${API_BASE_URL}/tickets/${t.id}/`,
        }),
        resourceName: 'ticket',
        editRoute: null,
    },
    'total-farms': {
        label: 'Total Farms',
        icon: Users,
        color: 'green',
        description: 'All farms currently registered in your system, regardless of their status. This includes active subscribers, expired clients, and farms on demo.',
        tip: 'Click on any farm name to view its full profile and history.',
        quickAction: { label: 'New Farm', to: '/clients' },
        fetchKey: 'clients',
        fetchUrl: `${API_BASE_URL}/clients/`,
        filter: (items) => items,
        columns: ['Farm Name', 'Contact', 'Status', 'Subscription'],
        getRow: (c) => ({
            id: c.id,
            cells: [c.farm_name, c.name, c.status || 'Active', c.subscription_end || 'N/A'],
            link: `/clients/${c.id}`,
            deleteUrl: `${API_BASE_URL}/clients/${c.id}/`,
        }),
        resourceName: 'client',
        editRoute: (id) => `/clients/${id}`,
    },
    'retention-rate': {
        label: 'Retention Rate',
        icon: Shield,
        color: 'green',
        description: 'The percentage of clients who renewed their subscriptions. A high retention rate shows that your clients are satisfied with the service. Track which farms have renewed and which have lapsed.',
        tip: 'Focus on clients with expiring subscriptions to maintain a high retention rate.',
        quickAction: { label: 'New Client', to: '/clients' },
        fetchKey: 'clients',
        fetchUrl: `${API_BASE_URL}/clients/`,
        filter: (items) => items.filter(c => c.status === 'Active' || c.is_active),
        columns: ['Farm Name', 'Contact', 'Subscription End', 'Status'],
        getRow: (c) => ({
            id: c.id,
            cells: [c.farm_name, c.name, c.subscription_end || 'Ongoing', c.status || 'Active'],
            link: `/clients/${c.id}`,
            deleteUrl: `${API_BASE_URL}/clients/${c.id}/`,
        }),
        resourceName: 'client',
        editRoute: (id) => `/clients/${id}`,
    },
    'collection-rate': {
        label: 'Collection Rate',
        icon: Target,
        color: 'red',
        description: 'How much of your invoiced amount has actually been collected. Shows paid invoices versus the total invoiced. A low rate means clients are not paying on time — follow up or set up payment reminders.',
        tip: 'Mark invoices "Paid to Us" promptly after receiving payment to keep this rate accurate.',
        quickAction: { label: 'New Invoice', to: '/invoices' },
        fetchKey: 'invoices',
        fetchUrl: `${API_BASE_URL}/invoices/`,
        filter: (items) => items,
        columns: ['Client', 'Type', 'Amount', 'Status'],
        getRow: (inv) => ({
            id: inv.id,
            cells: [
                inv.client_name || `Client #${inv.client}`,
                inv.invoice_type,
                `${parseFloat(inv.customer_total || inv.total_amount || 0).toLocaleString()} ${inv.currency || 'EGP'}`,
                inv.status,
            ],
            link: '/invoices',
            deleteUrl: `${API_BASE_URL}/invoices/${inv.id}/`,
        }),
        resourceName: 'invoice',
        editRoute: null,
    },
    'sla-adherence': {
        label: 'SLA Adherence',
        icon: Gauge,
        color: 'green',
        description: 'Percentage of support tickets resolved within the 48-hour SLA window. This metric reflects your team\'s responsiveness. Tickets still open past 48 hours are SLA violations.',
        tip: 'Aim for 100% SLA adherence. Each unresolved ticket after 48h counted as a breach.',
        quickAction: { label: 'New Ticket', to: '/new-ticket' },
        fetchKey: 'tickets',
        fetchUrl: `${API_BASE_URL}/tickets/`,
        filter: (items) => items,
        columns: ['Title', 'Client', 'Status', 'Created'],
        getRow: (t) => ({
            id: t.id,
            cells: [
                t.title || t.description?.slice(0, 40) + '...' || 'Untitled',
                t.client_name || `Client #${t.client}`,
                t.status,
                new Date(t.created_at).toLocaleDateString(),
            ],
            link: '/tickets',
            deleteUrl: `${API_BASE_URL}/tickets/${t.id}/`,
        }),
        resourceName: 'ticket',
        editRoute: null,
    },
    'revenue-per-client': {
        label: 'Revenue / Client',
        icon: DollarSign,
        color: 'cyan',
        description: 'Average revenue earned per active client. Calculated by dividing total received payments by the number of active farms. Growing this number means increasing revenue without needing new clients.',
        tip: 'Upselling additional modules to existing clients is the easiest way to grow revenue per client.',
        quickAction: { label: 'New Invoice', to: '/invoices' },
        fetchKey: 'invoices',
        fetchUrl: `${API_BASE_URL}/invoices/`,
        filter: (items) => items.filter(i => i.status === 'Paid to Us'),
        columns: ['Client', 'Type', 'Amount', 'Paid On'],
        getRow: (inv) => ({
            id: inv.id,
            cells: [
                inv.client_name || `Client #${inv.client}`,
                inv.invoice_type,
                `${parseFloat(inv.customer_total || inv.total_amount || 0).toLocaleString()} ${inv.currency || 'EGP'}`,
                new Date(inv.updated_at || inv.created_at).toLocaleDateString(),
            ],
            link: '/invoices',
            deleteUrl: `${API_BASE_URL}/invoices/${inv.id}/`,
        }),
        resourceName: 'invoice',
        editRoute: null,
    },
    'serials': {
        label: '4Genetics Serials',
        icon: Barcode,
        color: 'cyan',
        description: 'Active 4Genetics serial numbers registered in your system. Each serial is a software license assigned to a client farm. Unassigned serials are available to assign to new clients.',
        tip: 'Assign serials promptly when a new client signs up to avoid delays in their onboarding.',
        quickAction: { label: 'Add Serial', to: '/serials' },
        fetchKey: 'serials',
        fetchUrl: `${API_BASE_URL}/genetics-serials/`,
        filter: (items) => items,
        columns: ['Serial', 'Client', 'Status', 'Created'],
        getRow: (s) => ({
            id: s.id,
            cells: [
                s.serial_number || s.serial || `#${s.id}`,
                s.client_name || s.client || 'Unassigned',
                s.is_active ? 'Active' : 'Inactive',
                new Date(s.created_at).toLocaleDateString(),
            ],
            link: '/serials',
            deleteUrl: `${API_BASE_URL}/genetics-serials/${s.id}/`,
        }),
        resourceName: 'serial',
        editRoute: null,
    },
    'demo-farms': {
        label: 'Farms in Demo',
        icon: Play,
        color: 'purple',
        description: 'Clients currently on a free trial or demo period. These are high-value prospects who have shown interest in the system. Follow up to convert them into paying customers before the demo expires.',
        tip: 'Demo clients who don\'t convert after 30 days of inactivity should be contacted directly.',
        quickAction: { label: 'New Demo Farm', to: '/clients' },
        fetchKey: 'clients',
        fetchUrl: `${API_BASE_URL}/clients/`,
        filter: (items) => items.filter(c => c.is_demo || c.status?.toLowerCase().includes('demo')),
        columns: ['Farm Name', 'Contact', 'Demo Expires', 'Status'],
        getRow: (c) => ({
            id: c.id,
            cells: [c.farm_name, c.name, c.subscription_end || 'N/A', c.status || 'Demo'],
            link: `/clients/${c.id}`,
            deleteUrl: `${API_BASE_URL}/clients/${c.id}/`,
        }),
        resourceName: 'client',
        editRoute: (id) => `/clients/${id}`,
    },
    'avg-response-time': {
        label: 'Avg Response Time',
        icon: Timer,
        color: 'blue',
        description: 'The average number of hours it takes your team to resolve a support ticket. Shorter times mean happier clients. Review recently closed tickets to identify patterns and bottlenecks.',
        tip: 'Fast responses build trust. Clients who get quick support are more likely to renew.',
        quickAction: { label: 'New Ticket', to: '/new-ticket' },
        fetchKey: 'tickets',
        fetchUrl: `${API_BASE_URL}/tickets/`,
        filter: (items) => items.filter(t => t.status === 'Closed' || t.resolved_at),
        columns: ['Title', 'Client', 'Resolved', 'Resolution Time'],
        getRow: (t) => {
            const hrs = t.resolved_at
                ? Math.round((new Date(t.resolved_at) - new Date(t.created_at)) / (1000 * 60 * 60))
                : null;
            return {
                id: t.id,
                cells: [
                    t.title || t.description?.slice(0, 40) + '...' || 'Untitled',
                    t.client_name || `Client #${t.client}`,
                    t.resolved_at ? new Date(t.resolved_at).toLocaleDateString() : '—',
                    hrs !== null ? `${hrs}h` : '—',
                ],
                link: '/tickets',
                deleteUrl: `${API_BASE_URL}/tickets/${t.id}/`,
            };
        },
        resourceName: 'ticket',
        editRoute: null,
    },
    'active-this-month': {
        label: 'Active This Month',
        icon: Zap,
        color: 'green',
        description: 'Clients who had any activity in the last 30 days — including support tickets, invoices, or interactions logged in the system. These are your most engaged farms.',
        tip: 'Use this list to identify your most engaged clients and prioritise their support.',
        quickAction: { label: 'New Client', to: '/clients' },
        fetchKey: 'clients',
        fetchUrl: `${API_BASE_URL}/clients/`,
        filter: (items) => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return items.filter(c => {
                const updated = new Date(c.updated_at || c.created_at);
                return updated >= thirtyDaysAgo;
            });
        },
        columns: ['Farm Name', 'Contact', 'Last Activity', 'Status'],
        getRow: (c) => ({
            id: c.id,
            cells: [
                c.farm_name,
                c.name,
                new Date(c.updated_at || c.created_at).toLocaleDateString(),
                c.status || 'Active',
            ],
            link: `/clients/${c.id}`,
            deleteUrl: `${API_BASE_URL}/clients/${c.id}/`,
        }),
        resourceName: 'client',
        editRoute: (id) => `/clients/${id}`,
    },
    'hot-leads': {
        label: 'Hot Leads',
        icon: Flame,
        color: 'orange',
        description: 'Clients whose subscriptions are imminently expiring — your hottest renewal opportunities. These farms need urgent outreach before their access lapses. A personal call or email at this stage dramatically improves conversion.',
        tip: 'Prepare a renewal quote in advance so you can send it immediately when you contact them.',
        quickAction: { label: 'New Invoice', to: '/invoices' },
        fetchKey: 'clients',
        fetchUrl: `${API_BASE_URL}/clients/`,
        filter: (items) => items.filter(c => {
            if (!c.subscription_end) return false;
            const diff = (new Date(c.subscription_end) - new Date()) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 30;
        }),
        columns: ['Farm Name', 'Contact', 'Expires In', 'Subscription End'],
        getRow: (c) => {
            const diff = c.subscription_end
                ? Math.ceil((new Date(c.subscription_end) - new Date()) / (1000 * 60 * 60 * 24))
                : null;
            return {
                id: c.id,
                cells: [
                    c.farm_name,
                    c.name,
                    diff !== null ? `${diff} days` : 'N/A',
                    c.subscription_end || 'N/A',
                ],
                link: `/clients/${c.id}`,
                deleteUrl: `${API_BASE_URL}/clients/${c.id}/`,
            };
        },
        resourceName: 'client',
        editRoute: (id) => `/clients/${id}`,
    },
    'expired-subscriptions': {
        label: 'Expired Subscriptions',
        icon: XCircle,
        color: 'red',
        description: 'Clients whose subscriptions have already lapsed. They no longer have active access to the system. These are re-engagement opportunities — reach out with a discount or renewal offer to win them back.',
        tip: 'Clients expired within the last 90 days are much easier to re-engage than older ones.',
        quickAction: { label: 'New Invoice', to: '/invoices' },
        fetchKey: 'clients',
        fetchUrl: `${API_BASE_URL}/clients/`,
        filter: (items) => items.filter(c => {
            if (!c.subscription_end) return false;
            return new Date(c.subscription_end) < new Date();
        }),
        columns: ['Farm Name', 'Contact', 'Expired On', 'Status'],
        getRow: (c) => ({
            id: c.id,
            cells: [c.farm_name, c.name, c.subscription_end || 'N/A', c.status || 'Expired'],
            link: `/clients/${c.id}`,
            deleteUrl: `${API_BASE_URL}/clients/${c.id}/`,
        }),
        resourceName: 'client',
        editRoute: (id) => `/clients/${id}`,
    },
    'resolved-tickets': {
        label: 'Resolved Tickets',
        icon: CheckCircle,
        color: 'green',
        description: 'Support tickets that have been successfully closed and resolved. A high resolved count shows your team is handling client issues effectively. Use this list to identify common problems and improve your documentation.',
        tip: 'Review resolved tickets regularly to spot recurring issues and build a knowledge base.',
        quickAction: { label: 'New Ticket', to: '/new-ticket' },
        fetchKey: 'tickets',
        fetchUrl: `${API_BASE_URL}/tickets/`,
        filter: (items) => items.filter(t => t.status === 'Closed'),
        columns: ['Title', 'Client', 'Resolved On', 'Priority'],
        getRow: (t) => ({
            id: t.id,
            cells: [
                t.title || t.description?.slice(0, 40) + '...' || 'Untitled',
                t.client_name || `Client #${t.client}`,
                t.resolved_at ? new Date(t.resolved_at).toLocaleDateString() : new Date(t.updated_at).toLocaleDateString(),
                t.priority || 'Normal',
            ],
            link: '/tickets',
            deleteUrl: `${API_BASE_URL}/tickets/${t.id}/`,
        }),
        resourceName: 'ticket',
        editRoute: null,
    },
    'in-progress': {
        label: 'In Progress',
        icon: Clock,
        color: 'orange',
        description: 'Support tickets that are currently being worked on by your team. These are active investigations or fixes in progress. Make sure each ticket has an owner and a target resolution time to avoid delays.',
        tip: 'Update ticket status regularly so clients know their issue is being handled.',
        quickAction: { label: 'New Ticket', to: '/new-ticket' },
        fetchKey: 'tickets',
        fetchUrl: `${API_BASE_URL}/tickets/`,
        filter: (items) => items.filter(t => t.status === 'In Progress'),
        columns: ['Title', 'Client', 'Opened', 'Priority'],
        getRow: (t) => ({
            id: t.id,
            cells: [
                t.title || t.description?.slice(0, 40) + '...' || 'Untitled',
                t.client_name || `Client #${t.client}`,
                new Date(t.created_at).toLocaleDateString(),
                t.priority || 'Normal',
            ],
            link: '/tickets',
            deleteUrl: `${API_BASE_URL}/tickets/${t.id}/`,
        }),
        resourceName: 'ticket',
        editRoute: null,
    },
    'total-revenue': {
        label: 'Total Revenue',
        icon: DollarSign,
        color: 'cyan',
        description: 'Total money actually collected from all paid invoices. This is your real income — it only counts invoices marked as "Paid to Us". Use this to track your business performance over time and plan for expansion.',
        tip: 'Compare this against your Uniform Agri costs to understand your net profit margin.',
        quickAction: { label: 'New Invoice', to: '/invoices' },
        fetchKey: 'invoices',
        fetchUrl: `${API_BASE_URL}/invoices/`,
        filter: (items) => items.filter(i => i.status === 'Paid to Us' || i.status === 'Paid to Uniform'),
        columns: ['Client', 'Type', 'Revenue', 'Paid On'],
        getRow: (inv) => ({
            id: inv.id,
            cells: [
                inv.client_name || `Client #${inv.client}`,
                inv.invoice_type,
                `${parseFloat(inv.customer_total || inv.total_amount || 0).toLocaleString()} ${inv.currency || 'EGP'}`,
                new Date(inv.updated_at || inv.created_at).toLocaleDateString(),
            ],
            link: '/invoices',
            deleteUrl: `${API_BASE_URL}/invoices/${inv.id}/`,
        }),
        resourceName: 'invoice',
        editRoute: null,
    },
};

const colorMap = {
    green: { bg: 'bg-green-500/10 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-500/20', badge: 'bg-green-500' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20', badge: 'bg-blue-500' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/20', badge: 'bg-orange-500' },
    red: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-500/20', badge: 'bg-red-500' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20', badge: 'bg-purple-500' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/20', badge: 'bg-cyan-500' },
};

export default function StatDetailPage() {
    const { tileId } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const config = TILE_CONFIG[tileId];

    const { data: rawData = [], isLoading, isError, refetch } = useQuery({
        queryKey: [config?.fetchKey, tileId],
        queryFn: async () => {
            const res = await fetch(config.fetchUrl);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        enabled: !!config,
    });

    const deleteMutation = useMutation({
        mutationFn: async (url) => {
            const res = await fetch(url, { method: 'DELETE' });
            if (!res.ok && res.status !== 204) throw new Error('Delete failed');
        },
        onSuccess: () => {
            queryClient.invalidateQueries([config?.fetchKey]);
            queryClient.invalidateQueries(['dashboardStats']);
            setDeleteConfirm(null);
        },
    });

    if (!config) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle size={48} className="text-red-400" />
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">Tile not found</h2>
                <button onClick={() => navigate('/')} className="text-green-600 hover:underline flex items-center gap-1">
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
            </div>
        );
    }

    const filtered = config.filter(rawData).filter(item => {
        if (!search) return true;
        const row = config.getRow(item);
        return row.cells.some(c => String(c).toLowerCase().includes(search.toLowerCase()));
    });

    const totalCount = config.filter(rawData).length;
    const colors = colorMap[config.color] || colorMap.green;
    const Icon = config.icon;

    return (
        <div className="px-4 pb-8 pt-2 md:px-6 md:pt-4 max-w-5xl mx-auto animate-in fade-in duration-400">

            {/* Back button */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back
            </button>

            {/* Hero header */}
            <div className={`rounded-2xl border p-6 mb-6 ${colors.border} ${colors.bg}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${colors.badge} bg-gradient-to-br shadow-lg shrink-0`}
                        style={{ background: `var(--tw-gradient-from, ${colors.badge})` }}>
                        <Icon size={24} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {config.label}
                            </h1>
                            <span className={`text-3xl font-extrabold tabular-nums ${colors.text}`}>
                                {isLoading ? '…' : totalCount}
                            </span>
                        </div>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {config.description}
                        </p>
                        {config.tip && (
                            <div className={`mt-3 flex items-start gap-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                <Info size={13} className="shrink-0 mt-0.5 text-amber-500" />
                                <span><b>Tip:</b> {config.tip}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
                <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={`flex-1 px-4 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-green-500 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
                />
                <button
                    onClick={refetch}
                    className={`p-2 rounded-xl border transition-colors ${isDark ? 'border-white/[0.08] hover:bg-white/[0.06] text-gray-400 hover:text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-800'}`}
                    title="Refresh"
                >
                    <RefreshCw size={16} />
                </button>
                {config.quickAction && (
                    <Link
                        to={config.quickAction.to}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-500 text-white shadow-md shadow-green-500/20 transition-all whitespace-nowrap"
                    >
                        <Plus size={15} />
                        {config.quickAction.label}
                    </Link>
                )}
            </div>

            {/* Data table */}
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.06]' : 'border-gray-200'}`}>
                {/* Table header */}
                <div className={`grid gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/[0.03] text-gray-500 border-b border-white/[0.06]' : 'bg-gray-50 text-gray-400 border-b border-gray-100'}`}
                    style={{ gridTemplateColumns: `1fr repeat(${config.columns.length - 1}, 1fr) 80px` }}>
                    {config.columns.map(col => (
                        <span key={col}>{col}</span>
                    ))}
                    <span className="text-right">Actions</span>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={32} className="animate-spin text-green-500" />
                    </div>
                )}

                {/* Error */}
                {isError && (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <AlertCircle size={32} className="text-red-400" />
                        <p className="text-sm text-gray-400">Failed to load data</p>
                    </div>
                )}

                {/* Empty */}
                {!isLoading && !isError && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <CheckCircle size={36} className="text-green-400" />
                        <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {search ? 'No results match your search.' : 'Nothing here right now — all clear!'}
                        </p>
                    </div>
                )}

                {/* Rows */}
                {!isLoading && filtered.map((item, idx) => {
                    const row = config.getRow(item);
                    return (
                        <div
                            key={row.id}
                            className={`grid gap-4 px-5 py-3.5 text-sm items-center transition-colors group ${isDark
                                ? idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'
                                : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                                } hover:bg-green-500/5`}
                            style={{ gridTemplateColumns: `1fr repeat(${config.columns.length - 1}, 1fr) 80px` }}>

                            {row.cells.map((cell, ci) => (
                                <span key={ci} className={`truncate ${ci === 0
                                    ? `font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`
                                    : `${isDark ? 'text-gray-400' : 'text-gray-500'}`
                                    }`}>
                                    {cell}
                                </span>
                            ))}

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-1.5">
                                {row.link && (
                                    <Link to={row.link}
                                        className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'}`}
                                        title="View">
                                        <ExternalLink size={14} />
                                    </Link>
                                )}
                                {config.editRoute && (
                                    <Link to={config.editRoute(row.id)}
                                        className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-blue-400' : 'hover:bg-blue-50 text-gray-400 hover:text-blue-600'}`}
                                        title="Edit">
                                        <Edit2 size={14} />
                                    </Link>
                                )}
                                <button
                                    onClick={() => setDeleteConfirm(row)}
                                    className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${isDark ? 'hover:bg-red-500/10 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-600'}`}
                                    title="Delete">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className={`mt-3 text-xs text-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                Showing {filtered.length} of {totalCount} {config.resourceName}(s)
                {search && ` matching "${search}"`}
            </p>

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-in fade-in duration-200">
                    <div className={`rounded-2xl border p-6 max-w-sm w-full shadow-2xl ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <Trash2 size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete {config.resourceName}?</h3>
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    "{deleteConfirm.cells[0]}"
                                </p>
                            </div>
                        </div>
                        <p className={`text-sm mb-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            This action cannot be undone. All associated data will be permanently removed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className={`flex-1 py-2 rounded-xl border font-medium text-sm transition-colors ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(deleteConfirm.deleteUrl)}
                                disabled={deleteMutation.isPending}
                                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
