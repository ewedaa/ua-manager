import React, { useState } from 'react';
import { X, Save, Loader2, AlertCircle, User, Tag, FileText, MessageSquare } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

const updateTicket = async (updatedTicket) => {
    const response = await fetch(`${API_BASE_URL}/tickets/${updatedTicket.id}/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTicket),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData) || 'Failed to update ticket');
    }
    return response.json();
};

export default function EditTicketModal({ ticket, onClose }) {
    const queryClient = useQueryClient();
    const { isDark } = useTheme();
    const [formData, setFormData] = useState({
        id: ticket.id,
        status: ticket.status || 'Open',
        resolution_notes: ticket.resolution_notes || '',
        issue_description: ticket.issue_description || '',
        category: ticket.category || '',
    });
    const [error, setError] = useState(null);

    const mutation = useMutation({
        mutationFn: updateTicket,
        onSuccess: () => {
            queryClient.invalidateQueries(['tickets']);
            onClose();
        },
        onError: (err) => {
            setError(err.message);
        },
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    const statusOptions = ['Open', 'In Progress', 'Resolved', 'Closed'];

    const getStatusColor = (status) => {
        if (isDark) {
            switch (status) {
                case 'Open': return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
                case 'In Progress': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
                case 'Resolved': return 'bg-green-500/15 text-green-400 border-green-500/20';
                case 'Closed': return 'bg-gray-500/15 text-gray-400 border-gray-500/20';
                default: return 'bg-gray-500/15 text-gray-400 border-gray-500/20';
            }
        }
        switch (status) {
            case 'Open': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Resolved': return 'bg-green-100 text-green-700 border-green-200';
            case 'Closed': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className={`rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-900/95 backdrop-blur-xl border border-white/[0.08]' : 'bg-white'}`}>
                {/* Header */}
                <div className={`p-6 border-b flex justify-between items-center sticky top-0 z-10 ${isDark ? 'border-white/[0.06] bg-gray-900/95 backdrop-blur-xl' : 'border-gray-100 bg-white'}`}>
                    <div>
                        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Ticket #{ticket.id}</h2>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{ticket.client_name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`transition-colors p-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className={`rounded-lg p-4 flex items-start gap-3 border ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                            <AlertCircle className={`flex-shrink-0 mt-0.5 ${isDark ? 'text-red-400' : 'text-red-500'}`} size={18} />
                            <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-700'}`}>{error}</p>
                        </div>
                    )}

                    {/* Ticket Info (Read-only) */}
                    <div className={`rounded-lg p-4 space-y-3 ${isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2 text-sm">
                            <User size={16} className="text-gray-400" />
                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Client:</span>
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{ticket.client_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Tag size={16} className="text-gray-400" />
                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Category:</span>
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{ticket.category}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                            <FileText size={16} className="text-gray-400 mt-0.5" />
                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Issue:</span>
                            <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>{ticket.issue_description}</span>
                        </div>
                    </div>

                    {/* Status Selection */}
                    <div>
                        <label className={`block text-xs font-bold uppercase mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</label>
                        <div className="grid grid-cols-2 gap-2">
                            {statusOptions.map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, status }))}
                                    className={`px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${formData.status === status
                                        ? getStatusColor(status) + (isDark ? ' ring-2 ring-offset-2 ring-offset-gray-900 ring-green-500' : ' ring-2 ring-offset-2 ring-green-500')
                                        : isDark ? 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-white/[0.15]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Feedback / Resolution Notes */}
                    <div>
                        <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <MessageSquare size={14} className="inline mr-1" />
                            Feedback / Resolution Notes
                        </label>
                        <textarea
                            name="resolution_notes"
                            value={formData.resolution_notes}
                            onChange={handleChange}
                            rows={4}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-500' : 'border-gray-300'}`}
                            placeholder="Add your feedback, resolution steps, or notes here..."
                        />
                    </div>

                    {/* Actions */}
                    <div className={`flex gap-3 pt-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 px-4 py-3 border rounded-lg transition-colors font-medium ${isDark ? 'border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {mutation.isPending ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
