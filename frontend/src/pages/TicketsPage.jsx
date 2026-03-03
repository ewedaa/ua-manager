import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Search, CheckCircle, Clock, AlertCircle, Edit2, FileDown, Printer, MessageSquare, Sparkles } from 'lucide-react';
import EditTicketModal from '../components/EditTicketModal';
import InlineEdit from '../components/InlineEdit';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

import { API_BASE_URL } from '../lib/api';

import { fetchTickets } from '../lib/fetchers';

export default function TicketsPage() {
    const { isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [draftingId, setDraftingId] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Handle filter from dashboard tiles
    useEffect(() => {
        const filterParam = searchParams.get('filter');
        if (filterParam === 'open') setStatusFilter('Open');
        else if (filterParam === 'in_progress') setStatusFilter('In Progress');
        else if (filterParam === 'resolved') setStatusFilter('Resolved');
    }, [searchParams]);

    const handleAIDraft = async (ticket) => {
        setDraftingId(ticket.id);
        try {
            const response = await fetch(`${API_BASE_URL}/ai-ticket-draft/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: ticket.issue_description })
            });
            const data = await response.json();
            if (data.draft) {
                await updateTicketField(ticket.id, 'resolution_notes', data.draft);
            }
        } catch (err) {
            console.error('Error drafting reply:', err);
        } finally {
            setDraftingId(null);
        }
    };

    const { data: tickets = [], isLoading, isError } = useQuery({
        queryKey: ['tickets'],
        queryFn: fetchTickets,
    });

    // Inline update ticket field
    const updateTicketField = async (ticketId, field, value) => {
        const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value }),
        });
        if (!response.ok) throw new Error('Failed to update');
        queryClient.invalidateQueries(['tickets']);
        return response.json();
    };

    // Bulk update status
    const handleBulkUpdateStatus = async (newStatus) => {
        if (!isAdmin || selectedIds.size === 0) return;
        try {
            await Promise.all(
                Array.from(selectedIds).map(id =>
                    fetch(`${API_BASE_URL}/tickets/${id}/`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus }),
                    })
                )
            );
            queryClient.invalidateQueries(['tickets']);
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Failed to update tickets', err);
        }
    };

    // Bulk delete tickets
    const handleBulkDelete = async () => {
        if (!isAdmin || selectedIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} tickets? This action cannot be undone.`)) return;
        try {
            await Promise.all(
                Array.from(selectedIds).map(id =>
                    fetch(`${API_BASE_URL}/tickets/${id}/`, {
                        method: 'DELETE',
                    })
                )
            );
            queryClient.invalidateQueries(['tickets']);
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Failed to delete tickets', err);
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchSearch = !searchTerm ||
            ticket.issue_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = !statusFilter || ticket.status === statusFilter;
        const matchCategory = !categoryFilter || ticket.category === categoryFilter;
        return matchSearch && matchStatus && matchCategory;
    });

    const handleExport = async () => {
        if (!tickets) return;
        const XLSX = await import('xlsx');
        const data = tickets.map(t => ({
            'Ticket ID': `#${t.id}`,
            'Category': t.category,
            'Client': t.client_name,
            'Issue': t.issue_description,
            'Status': t.status,
            'Notes': t.resolution_notes || '',
            'Date': new Date(t.created_at).toLocaleDateString()
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tickets");
        XLSX.writeFile(wb, "tickets_list.xlsx");
    };

    const handlePrint = () => {
        window.print();
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Resolved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/20">
                        <CheckCircle size={12} />
                        Resolved
                    </span>
                );
            case 'In Progress':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        <Clock size={12} />
                        In Progress
                    </span>
                );
            case 'Closed':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/15 text-gray-400 border border-gray-500/20">
                        <CheckCircle size={12} />
                        Closed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        <AlertCircle size={12} />
                        Open
                    </span>
                );
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    const isAllSelected = filteredTickets.length > 0 && selectedIds.size === filteredTickets.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTickets.map(t => t.id)));
        }
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    return (
        <div className="px-4 pb-4 pt-1 md:px-6 md:pb-6 md:pt-3 animate-in fade-in duration-500">
            {/* Edit Modal */}
            {selectedTicket && (
                <EditTicketModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                />
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 mb-8 pt-2">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Support Tickets</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and track customer support requests</p>
                </div>

                <div className="flex gap-3 flex-wrap items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none w-full md:w-64 transition-all duration-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none transition-all duration-300"
                    >
                        <option value="">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none transition-all duration-300"
                    >
                        <option value="">All Categories</option>
                        <option value="Database">Database</option>
                        <option value="Milk Meter">Milk Meter</option>
                        <option value="Activity System">Activity System</option>
                        <option value="Other">Other</option>
                    </select>


                    <button
                        onClick={handleExport}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all duration-300 hover:scale-105 hover:shadow-md"
                    >
                        <FileDown size={18} />
                        Export
                    </button>

                    <button
                        onClick={handlePrint}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all duration-300 hover:scale-105 hover:shadow-md"
                    >
                        <Printer size={18} />
                        Print
                    </button>

                    <Link
                        to="/new-ticket"
                        className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all duration-300 ml-auto hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
                    >
                        <Plus size={20} />
                        Create New Ticket
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon={AlertCircle}
                    label="Open"
                    value={tickets.filter(t => t.status === 'Open').length}
                    color="orange"
                    to="/tickets"
                />
                <StatCard
                    icon={Clock}
                    label="In Progress"
                    value={tickets.filter(t => t.status === 'In Progress').length}
                    color="blue"
                    to="/tickets"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Resolved"
                    value={tickets.filter(t => t.status === 'Resolved').length}
                    color="green"
                    to="/tickets"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Closed"
                    value={tickets.filter(t => t.status === 'Closed').length}
                    color="gray"
                    to="/tickets"
                />
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && isAdmin && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <span className="font-medium text-green-800 dark:text-green-400">
                        {selectedIds.size} ticket{selectedIds.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                        <select
                            className="px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800/50 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-green-500"
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleBulkUpdateStatus(e.target.value);
                                    e.target.value = ''; // Reset dropdown
                                }
                            }}
                            defaultValue=""
                        >
                            <option value="" disabled>Change Status...</option>
                            <option value="Open">Set Open</option>
                            <option value="In Progress">Set In Progress</option>
                            <option value="Resolved">Set Resolved</option>
                            <option value="Closed">Set Closed</option>
                        </select>
                        <button
                            onClick={handleBulkDelete}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-200 dark:border-red-800/30"
                        >
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}

            {/* Tickets Table */}
            {filteredTickets.length > 0 ? (
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[700px]">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    {isAdmin && (
                                        <th className="px-6 py-4 w-12 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                checked={isAllSelected}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                    )}
                                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200">Ticket ID</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200">Subject / Category</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200">Client</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200">Status</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200">Notes</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200">Date</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200 print:hidden">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                                {filteredTickets.map((ticket) => (
                                    <tr key={ticket.id} className={`${selectedIds.has(ticket.id) ? 'bg-green-50/50 dark:bg-green-900/5' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'} transition-colors duration-200`}>
                                        {isAdmin && (
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                    checked={selectedIds.has(ticket.id)}
                                                    onChange={() => toggleSelect(ticket.id)}
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">#{ticket.id}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900 dark:text-white">{ticket.category}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{ticket.issue_description}</p>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{ticket.client_name}</td>
                                        <td className="px-6 py-4">
                                            {isAdmin ? (
                                                <InlineEdit
                                                    value={ticket.status}
                                                    onSave={(val) => updateTicketField(ticket.id, 'status', val)}
                                                    type="select"
                                                    options={[
                                                        { value: 'Open', label: 'Open' },
                                                        { value: 'In Progress', label: 'In Progress' },
                                                        { value: 'Resolved', label: 'Resolved' },
                                                        { value: 'Closed', label: 'Closed' },
                                                    ]}
                                                />
                                            ) : getStatusBadge(ticket.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {isAdmin ? (
                                                <InlineEdit
                                                    value={ticket.resolution_notes || ''}
                                                    onSave={(val) => updateTicketField(ticket.id, 'resolution_notes', val)}
                                                    type="textarea"
                                                    placeholder="Add notes..."
                                                    className="max-w-xs"
                                                />
                                            ) : (
                                                ticket.resolution_notes ? (
                                                    <div className="flex items-start gap-1.5 max-w-xs">
                                                        <MessageSquare size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                                                        <p className="text-sm text-gray-600 truncate">{ticket.resolution_notes}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No notes</span>
                                                )
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {new Date(ticket.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 print:hidden flex items-center gap-1">
                                            {isAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => handleAIDraft(ticket)}
                                                        disabled={draftingId === ticket.id}
                                                        className="text-purple-500 hover:text-purple-600 transition-all duration-200 p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg hover:scale-110 disabled:opacity-50"
                                                        title="AI Draft Reply"
                                                    >
                                                        {draftingId === ticket.id ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedTicket(ticket)}
                                                        className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-all duration-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg hover:scale-110"
                                                        title="Edit Ticket"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <EmptyState
                    icon={AlertCircle}
                    title={searchTerm ? 'No tickets found' : 'No Active Tickets'}
                    description={searchTerm ? `We couldn't find any tickets matching "${searchTerm}".` : "Great job! All support requests have been handled. create a new ticket if an issue arises."}
                    // actionLabel="Create New Ticket"
                    // secondaryActionLink="/new-ticket"
                    secondaryActionLabel="Create New Ticket"
                    secondaryActionLink="/new-ticket"
                />
            )}
        </div>
    );
}
