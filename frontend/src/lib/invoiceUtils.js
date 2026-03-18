/**
 * Shared invoice utilities used across InvoiceMaker and AddInvoiceModal.
 */

import { API_BASE_URL } from './api';

/**
 * Sort subscription modules into canonical display order:
 * 1. Base module
 * 2. DairyLive modules (by cow count)
 * 3. Big farm modules (by cow count)
 * 4. Everything else
 */
export function sortModules(modules) {
    return [...modules].sort((a, b) => {
        const getOrder = (name) => {
            if (name.includes('Base module')) return 0;
            if (name.toLowerCase().includes('dairylive')) {
                const match = name.match(/(\d+)/);
                return 100000 + (match ? parseInt(match[1], 10) : 0);
            }
            if (name.includes('Big farm module')) {
                const match = name.match(/(\d+)/);
                return 200000 + (match ? parseInt(match[1], 10) : 0);
            }
            return 300000;
        };
        return getOrder(a.name) - getOrder(b.name);
    });
}

/**
 * Given a list of all modules and an array of selected IDs,
 * when a "Big farm module" is selected automatically include
 * all lower-tier Big farm modules.
 */
export function toggleModuleWithCascade(prevIds, toggledId, allModules, activeModules) {
    const isSelecting = !prevIds.includes(toggledId);
    if (!isSelecting) return prevIds.filter(x => x !== toggledId);

    const mod = allModules.find(m => m.id === toggledId);
    if (!mod || !mod.name.includes('Big farm module')) return [...prevIds, toggledId];

    const getCows = (name) => {
        const match = name.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    };

    const targetCows = getCows(mod.name);
    const lowerTierIds = activeModules
        .filter(m => m.name.includes('Big farm module') && getCows(m.name) < targetCows)
        .map(m => m.id);

    return Array.from(new Set([...prevIds, toggledId, ...lowerTierIds]));
}

/**
 * Fetch live EUR→EGP exchange rate from the backend.
 * Returns { rate, date, is_fallback } or throws.
 */
export async function fetchLiveExchangeRate() {
    const res = await fetch(`${API_BASE_URL}/invoices/live_exchange_rate/`);
    const data = await res.json();
    return data;
}

/**
 * Open the auto-generated PDF for a newly created invoice.
 */
export async function autoOpenInvoicePDF(invoiceId) {
    try {
        const pdfRes = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/generate_pdf/`, { method: 'POST' });
        if (!pdfRes.ok) return;
        const pdfData = await pdfRes.json();
        if (pdfData.pdf_url) {
            const backendOrigin = new URL(API_BASE_URL).origin;
            const fullUrl = pdfData.pdf_url.startsWith('http')
                ? pdfData.pdf_url
                : `${backendOrigin}${pdfData.pdf_url}`;
            window.open(`${fullUrl}?t=${Date.now()}`, '_blank');
        }
    } catch (err) {
        console.warn('PDF auto-download failed:', err);
    }
}
