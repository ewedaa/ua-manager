import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, FileText } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

export const InvoicePDFButton = ({ invoice }) => {
    const [generatingType, setGeneratingType] = useState(null);
    const queryClient = useQueryClient();

    const handleGenerate = async (currency) => {
        setGeneratingType(currency);
        try {
            const res = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/generate_pdf/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_currency: currency })
            });
            if (!res.ok) throw new Error('Failed to generate PDF');
            const data = await res.json();
            queryClient.invalidateQueries(['invoices']);
            const backendOrigin = new URL(API_BASE_URL).origin;
            const fullUrl = data.pdf_url.startsWith('http') ? data.pdf_url : `${backendOrigin}${data.pdf_url}`;
            const noCacheUrl = `${fullUrl}?t=${new Date().getTime()}`;
            window.open(noCacheUrl, '_blank');
        } catch (error) {
            console.error(error);
            alert('Failed to generate PDF');
        } finally {
            setGeneratingType(null);
        }
    };

    return (
        <div className="flex items-center gap-1">
            <button
                onClick={() => handleGenerate('EUR')}
                disabled={generatingType !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-500 border border-blue-500/25 rounded-lg transition-all text-xs font-semibold disabled:opacity-50"
                title="Download EUR PDF"
            >
                {generatingType === 'EUR' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                EUR
            </button>
            <button
                onClick={() => handleGenerate('EGP')}
                disabled={generatingType !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-500 border border-green-500/25 rounded-lg transition-all text-xs font-semibold disabled:opacity-50"
                title="Download EGP PDF"
            >
                {generatingType === 'EGP' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                EGP
            </button>
        </div>
    );
};

export const InternalPDFButton = ({ invoice }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/generate_internal_pdf/`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to generate internal PDF');
            const data = await res.json();
            const backendOrigin = new URL(API_BASE_URL).origin;
            const fullUrl = data.pdf_url.startsWith('http') ? data.pdf_url : `${backendOrigin}${data.pdf_url}`;
            const noCacheUrl = `${fullUrl}?t=${new Date().getTime()}`;
            window.open(noCacheUrl, '_blank');
        } catch (error) {
            console.error(error);
            alert('Failed to generate internal PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 rounded-lg transition-all text-xs font-semibold disabled:opacity-50"
            title="Generate Internal PDF (with cost breakdown)"
        >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {isGenerating ? 'Generating...' : 'Internal'}
        </button>
    );
};
