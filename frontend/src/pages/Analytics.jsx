import React, { useState } from 'react';
import { Download, Sparkles, FileText, Loader2, CheckCircle } from 'lucide-react';
import DashboardCharts from '../components/DashboardCharts';
import { API_BASE_URL } from '../lib/api';

export default function Analytics() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleDownloadReport = async () => {
        setIsGenerating(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/business-report/`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to generate report');
            }

            const data = await response.json();

            if (data.pdf_url) {
                // We assume backend returns pdf_url or binary.
                // If it returns a URL:
                window.open(data.pdf_url.startsWith('http') ? data.pdf_url : `${new URL(API_BASE_URL).origin}${data.pdf_url}`, '_blank');
                setSuccessMessage('Report generated successfully!');
            } else if (data.error) {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error generating report:', error);
            setErrorMessage('Failed to generate report. Please try again.');
        } finally {
            setIsGenerating(false);
            setTimeout(() => setSuccessMessage(''), 5000);
        }
    };

    return (
        <div className="px-4 pb-4 pt-1 md:px-6 md:pb-6 md:pt-3 space-y-4 md:space-y-5 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="relative">
                            <FileText className="text-blue-500" size={26} />
                            <span className="absolute inset-0 text-blue-400/40 blur-md">
                                <FileText size={26} />
                            </span>
                        </span>
                        Analytics & Reports
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        Deep dive into your operational metrics and download consolidated reports.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {successMessage && <span className="text-green-500 flex items-center gap-2 text-sm font-medium"><CheckCircle size={16} /> {successMessage}</span>}
                    {errorMessage && <span className="text-red-500 text-sm font-medium">{errorMessage}</span>}

                    <button
                        onClick={handleDownloadReport}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                <span>Download Full Report (PDF)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Charts */}
            <div className="pt-4">
                <DashboardCharts />
            </div>
        </div>
    );
}
