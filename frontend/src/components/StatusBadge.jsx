import React from 'react';

const STATUS_STYLES = {
    'Due':             'bg-red-500/15 text-red-400 border border-red-500/20',
    'Paid to Us':      'bg-green-500/15 text-green-400 border border-green-500/20',
    'Paid to Uniform': 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
};

/**
 * Displays a coloured pill badge for an invoice payment status.
 */
export default function StatusBadge({ status }) {
    return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[status] || 'bg-gray-500/15 text-gray-400 border border-gray-500/20'}`}>
            {status}
        </span>
    );
}
