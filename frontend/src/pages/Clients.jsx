import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Plus, Search, X, Check, AlertCircle, FileDown, Printer, Users, LayoutGrid, List, Filter, ArrowUpDown } from 'lucide-react';
import ClientCard from '../components/ClientCard';
import EmptyState from '../components/EmptyState';

import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';

import { fetchClients } from '../lib/fetchers';

const createClient = async (newClient) => {
    const response = await fetch(`${API_BASE_URL}/clients/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClient),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData) || 'Failed to create client');
    }
    const clientData = await response.json();

    // Legacy 4Genetics auto-enroll removed
    return clientData;
};

export default function Clients() {
    const { isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get('action') === 'new') {
            setIsModalOpen(true);
            setSearchParams({});
        }
        // Handle filter from dashboard tiles
        const filterParam = searchParams.get('filter');
        if (filterParam === 'expiring') setFilterStatus('expiring_soon');
        else if (filterParam === 'expired') setFilterStatus('expired');
        else if (filterParam === 'active') setFilterStatus('active');
        else if (filterParam === 'demo') setFilterStatus('demo');
        else if (filterParam === 'due') setFilterFinance('due_invoices');
    }, [searchParams, setSearchParams]);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterFinance, setFilterFinance] = useState('all');
    const [filterType, setFilterType] = useState('subscribers'); // 'subscribers' or 'quoted'
    const [sortBy, setSortBy] = useState('name');
    const [filterOpen, setFilterOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: '-',
        farm_name: '',
        phone: '-',
        subscription_start_date: '',
        subscription_end_date: '',
        serial_number: '',
        subscription_modules: '',
        general_notes: '',
        is_demo: false,
        livestock_type: 'Dairy Cows',
        role: ''
    });
    const [formError, setFormError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    const { data: clients, isLoading, isError, error } = useQuery({
        queryKey: ['clients'],
        queryFn: fetchClients,
    });

    const mutation = useMutation({
        mutationFn: createClient,
        onSuccess: () => {
            queryClient.invalidateQueries(['clients']);
            setIsModalOpen(false);
            setFormData({
                name: '',
                farm_name: '',
                phone: '',
                subscription_start_date: '',
                subscription_end_date: '',
                serial_number: '',
                subscription_modules: '',
                general_notes: '',
                is_demo: false,
                livestock_type: 'Dairy Cows',
                role: ''
            });
            setFormError(null);
        },
        onError: (err) => {
            setFormError(err.message);
        },
    });

    const filteredClients = clients?.filter(client => {
        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.farm_name.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStatus = true;
        let matchesFinance = true;

        if (filterStatus === 'active') matchesStatus = client.status === 'Active';
        if (filterStatus === 'expiring_soon') matchesStatus = client.status === 'Expiring Soon';
        if (filterStatus === 'expired') matchesStatus = client.status === 'Expired';
        if (filterStatus === 'demo') matchesStatus = client.is_demo === true;

        if (filterFinance === 'due_invoices') {
            const hasDue = client.invoices?.some(inv => !inv.invoice_type?.toLowerCase().includes('quotation') && inv.status === 'Due' && parseFloat(inv.total_amount) > 0);
            matchesFinance = !!hasDue;
        }

        const matchesType = filterType === 'quoted' ? client.is_quoted : !client.is_quoted;

        return matchesSearch && matchesStatus && matchesFinance && matchesType;
    }).sort((a, b) => {
        if (sortBy === 'name') return a.farm_name.localeCompare(b.farm_name);

        const dateA = new Date(a.subscription_end_date).getTime() || 0;
        const dateB = new Date(b.subscription_end_date).getTime() || 0;
        if (sortBy === 'expiry_asc') return dateA - dateB;
        if (sortBy === 'expiry_desc') return dateB - dateA;

        if (sortBy === 'due_amount') {
            const dueA = a.invoices?.filter(i => !i.invoice_type?.toLowerCase().includes('quotation') && i.status === 'Due').reduce((sum, i) => sum + parseFloat(i.total_amount), 0) || 0;
            const dueB = b.invoices?.filter(i => !i.invoice_type?.toLowerCase().includes('quotation') && i.status === 'Due').reduce((sum, i) => sum + parseFloat(i.total_amount), 0) || 0;
            return dueB - dueA;
        }
        return 0;
    });

    const handleInputChange = (e) => {
        let { name, value } = e.target;
        if (name === 'serial_number') {
            // Remove non-alphanumeric, convert to uppercase, and format XXXX-XXXX...
            value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            value = value.match(/.{1,4}/g)?.join('-') || '';
            value = value.substring(0, 24); // max 24 chars (5 groups of 4 + 4 dashes)
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errors = {};
        if (!formData.farm_name.trim()) errors.farm_name = 'Farm name is required';
        if (!formData.subscription_start_date) errors.subscription_start_date = 'Start date is required';
        if (!formData.subscription_end_date) errors.subscription_end_date = 'End date is required';
        if (formData.subscription_start_date && formData.subscription_end_date && formData.subscription_end_date <= formData.subscription_start_date) {
            errors.subscription_end_date = 'End date must be after start date';
        }
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});

        // Send farm_name as name, and dummy phone to bypass backend validation
        const payload = {
            ...formData,
            name: formData.farm_name,
            phone: '-'
        };
        mutation.mutate(payload);
    };

    const handleExport = async () => {
        if (!clients) return;
        const XLSX = await import('xlsx');
        const data = clients.map(client => ({
            'Client Name': client.name,
            'Farm Name': client.farm_name,
            'Phone': client.phone,
            'Modules': client.subscription_modules || 'None',
            'Start Date': client.subscription_start_date,
            'End Date': client.subscription_end_date,
            'Status': client.status
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clients");
        XLSX.writeFile(wb, "clients_list.xlsx");
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 text-center">
                <h3 className="text-xl font-bold text-red-500 mb-2">Error Loading Clients</h3>
                <p className="text-gray-500">{error.message}</p>
            </div>
        );
    }

    return (
        <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-3 mb-6 pt-1">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Clients</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your farm subscribers</p>
                </div>

                <div className="flex gap-4 flex-wrap items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none w-full md:w-64 transition-all duration-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button
                            onClick={() => setFilterType('subscribers')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filterType === 'subscribers'
                                ? 'bg-white dark:bg-gray-700 shadow-sm text-green-600 dark:text-green-400'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Subscribers
                        </button>
                        <button
                            onClick={() => setFilterType('quoted')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filterType === 'quoted'
                                ? 'bg-white dark:bg-gray-700 shadow-sm text-amber-600 dark:text-amber-400'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Quoted Farms
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button onClick={() => setFilterOpen(!filterOpen)} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-xl flex items-center gap-2 font-medium transition-all duration-300 ${filterOpen ? 'ring-2 ring-green-500' : ''}`}>
                                <Filter size={18} />
                                <span className="hidden sm:inline">Filter</span>
                            </button>
                            {filterOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 p-3">
                                        <div className="mb-3">
                                            <label className="text-xs text-gray-500 font-semibold px-1 uppercase tracking-wider">Status</label>
                                            <select
                                                value={filterStatus}
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                                className="w-full mt-1 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-sm px-2 py-1.5 focus:ring-0"
                                            >
                                                <option value="all">All Statuses</option>
                                                <option value="active">Active</option>
                                                <option value="expiring_soon">Expiring Soon</option>
                                                <option value="expired">Expired</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 font-semibold px-1 uppercase tracking-wider">Finance</label>
                                            <select
                                                value={filterFinance}
                                                onChange={(e) => setFilterFinance(e.target.value)}
                                                className="w-full mt-1 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-sm px-2 py-1.5 focus:ring-0"
                                            >
                                                <option value="all">All Finances</option>
                                                <option value="due_invoices">Has Due Invoices</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="relative group">
                            <button className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-xl flex items-center gap-2 font-medium transition-all duration-300">
                                <ArrowUpDown size={18} />
                                <span className="hidden sm:inline">Sort</span>
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-2">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-sm px-2 py-1.5 focus:ring-0"
                                >
                                    <option value="name">Farm Name (A-Z)</option>
                                    <option value="expiry_asc">Expiry (Soonest)</option>
                                    <option value="expiry_desc">Expiry (Furthest)</option>
                                    <option value="due_amount">Highest Due</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleExport}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-xl flex items-center justify-center font-medium transition-all duration-300 hover:scale-105 hover:shadow-md"
                            title="Export to Excel"
                        >
                            <FileDown size={18} />
                        </button>
                    </div>

                    {isAdmin && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all duration-300 ml-auto hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
                        >
                            <Plus size={20} />
                            Add Client
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            {
                filteredClients?.length === 0 && !isLoading ? (
                    <EmptyState
                        icon={Users}
                        title={searchTerm ? 'No clients found' : 'No Clients Yet'}
                        description={searchTerm ? `We couldn't find any clients matching "${searchTerm}". Try a different search term.` : "Get started by adding your first farm client to track subscriptions and services."}
                        actionLabel="Add New Client"
                        onAction={() => setIsModalOpen(true)}
                    // secondaryActionLabel="Learn about Clients"
                    // secondaryActionLink="/docs"
                    />
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start" : "flex flex-col gap-4"}>
                        {filteredClients?.map(client => (
                            <ClientCard key={client.id} client={client} viewMode={viewMode} />
                        ))}
                    </div>
                )
            }

            {/* Modal */}
            {
                isModalOpen && (
                    createPortal(
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-300 border border-gray-200 dark:border-white/10 my-auto max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Client</h2>
                                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200 hover:rotate-90">
                                        <X size={24} />
                                    </button>
                                </div>

                                {formError && (
                                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg flex items-start gap-2 text-sm border border-transparent dark:border-red-500/20">
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                        <p className="break-words">{formError}</p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Farm Name</label>
                                        <input
                                            type="text"
                                            name="farm_name"
                                            className={`w-full px-3 py-2 border rounded-xl bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 ${fieldErrors.farm_name ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-white/[0.08]'}`}
                                            value={formData.farm_name}
                                            onChange={handleInputChange}
                                        />
                                        {fieldErrors.farm_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.farm_name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
                                        <input
                                            type="text"
                                            name="serial_number"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.08] rounded-xl bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200"
                                            value={formData.serial_number}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Livestock Type *</label>
                                        <select
                                            name="livestock_type"
                                            value={formData.livestock_type}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.08] rounded-xl bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200"
                                        >
                                            <option value="Dairy Cows">Dairy Cows</option>
                                            <option value="Dairy Buffalos">Dairy Buffalos</option>
                                            <option value="Fattening">Fattening</option>
                                            <option value="Sheep and Goat">Sheep and Goat</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                name="subscription_start_date"
                                                className={`w-full px-3 py-2 border rounded-xl bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 ${fieldErrors.subscription_start_date ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-white/[0.08]'}`}
                                                value={formData.subscription_start_date}
                                                onChange={handleInputChange}
                                            />
                                            {fieldErrors.subscription_start_date && <p className="text-xs text-red-500 mt-1">{fieldErrors.subscription_start_date}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                            <input
                                                type="date"
                                                name="subscription_end_date"
                                                className={`w-full px-3 py-2 border rounded-xl bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 ${fieldErrors.subscription_end_date ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-white/[0.08]'}`}
                                                value={formData.subscription_end_date}
                                                onChange={handleInputChange}
                                            />
                                            {fieldErrors.subscription_end_date && <p className="text-xs text-red-500 mt-1">{fieldErrors.subscription_end_date}</p>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 p-4 rounded-xl border border-gray-300 dark:border-white/[0.08] bg-gray-50/50 dark:bg-gray-800/50">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="is_demo"
                                                checked={formData.is_demo}
                                                onChange={(e) => setFormData(p => ({ ...p, is_demo: e.target.checked }))}
                                                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 bg-white dark:bg-gray-700 dark:border-gray-600"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Is Demo Farm?</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                                        <textarea
                                            name="general_notes"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.08] rounded-xl bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none transition-all duration-200"
                                            rows={2}
                                            value={formData.general_notes}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-all duration-300"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={mutation.isPending}
                                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-300 disabled:opacity-50 hover:shadow-lg hover:shadow-green-500/25"
                                        >
                                            {mutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                            Save Client
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>,
                        document.body
                    )
                )
            }
        </div >
    );
}
