import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Search, Home, Ticket, Users, Settings, Bot,
    Barcode, CreditCard, Monitor, FileText,
    BookOpen, ClipboardList, Phone, PlusCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';

export default function CommandPalette({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [dynamicResults, setDynamicResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const navigate = useNavigate();
    const { isDark } = useTheme();

    // Define static commands
    const staticCommands = useMemo(() => [
        // Navigation
        { section: 'Pages', icon: Home, label: 'Dashboard', path: '/' },
        { section: 'Pages', icon: Bot, label: 'Ask AI Assistant', path: '/ask-ai' },
        { section: 'Pages', icon: Users, label: 'Clients Management', path: '/clients' },
        { section: 'Pages', icon: FileText, label: 'Report Writer', path: '/reports/writer' }, // Added new command
        { section: 'Pages', icon: Ticket, label: 'Tickets System', path: '/tickets' },
        { section: 'Pages', icon: FileText, label: 'Invoice Maker', path: '/invoices' },
        { section: 'Pages', icon: Monitor, label: 'Projects', path: '/projects' },

        // Actions
        { section: 'Actions', icon: PlusCircle, label: 'Create New Ticket', path: '/new-ticket' },
        { section: 'Actions', icon: PlusCircle, label: 'Add New Client', path: '/clients?action=new' },

        // Tools
        { section: 'Tools', icon: Barcode, label: '4Genetics Serials', path: '/serials' },
        { section: 'Tools', icon: CreditCard, label: 'Payment Tracker', path: '/payments' },
        { section: 'Tools', icon: ClipboardList, label: 'My To-Do', path: '/todo' },

        // Support & Settings
        { section: 'System', icon: Settings, label: 'Settings', path: '/settings' },
        { section: 'System', icon: Phone, label: 'Support Contacts', path: '/support' },
        { section: 'System', icon: BookOpen, label: 'Documentation', path: '/docs' },
    ], []);

    // Filter static commands
    const filteredStaticCommands = useMemo(() => {
        if (!query) return staticCommands;
        const lowerQuery = query.toLowerCase();
        return staticCommands.filter(cmd =>
            cmd.label.toLowerCase().includes(lowerQuery) ||
            cmd.section.toLowerCase().includes(lowerQuery)
        );
    }, [query, staticCommands]);

    // Combine results
    const combinedResults = [...filteredStaticCommands, ...dynamicResults];

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query, dynamicResults]);

    // Dynamic Search Effect
    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 2) {
                setDynamicResults([]);
                return;
            }

            setIsSearching(true);
            try {
                // Parallel fetching
                const [clientsRes, ticketsRes, invoicesRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/clients/?search=${query}`).then(r => r.json()),
                    fetch(`${API_BASE_URL}/tickets/?search=${query}`).then(r => r.json()),
                    fetch(`${API_BASE_URL}/invoices/?search=${query}`).then(r => r.json())
                ]);

                const newResults = [];

                // Process Clients
                if (Array.isArray(clientsRes)) {
                    clientsRes.slice(0, 3).forEach(c => {
                        newResults.push({
                            section: 'Clients',
                            icon: Users,
                            label: c.farm_name,
                            subLabel: c.name,
                            path: `/clients?id=${c.id}` // Ideally we have a client detail view or open modal
                        });
                    });
                }

                // Process Tickets
                if (Array.isArray(ticketsRes)) {
                    ticketsRes.slice(0, 3).forEach(t => {
                        newResults.push({
                            section: 'Tickets',
                            icon: Ticket,
                            label: `Tx #${t.id}: ${t.issue_description.substring(0, 30)}...`,
                            subLabel: t.status,
                            path: `/tickets?id=${t.id}`
                        });
                    });
                }

                // Process Invoices
                if (Array.isArray(invoicesRes)) {
                    invoicesRes.slice(0, 3).forEach(i => {
                        newResults.push({
                            section: 'Invoices',
                            icon: FileText,
                            label: `Inv #${i.id} - $${i.total_amount}`,
                            subLabel: i.status,
                            path: `/invoices?id=${i.id}`
                        });
                    });
                }

                setDynamicResults(newResults);
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(fetchResults, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleSelect = React.useCallback((command) => {
        navigate(command.path);
        onClose();
        setQuery('');
    }, [navigate, onClose]);

    // Handle Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % combinedResults.length);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev - 1 + combinedResults.length) % combinedResults.length);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (combinedResults[selectedIndex]) {
                        handleSelect(combinedResults[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, combinedResults, selectedIndex, handleSelect]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Palette Window */}
            <div className={`
                relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden
                transform transition-all animate-in fade-in zoom-in-95 duration-200
                ${isDark ? 'bg-gray-900/95 backdrop-blur-xl border border-white/[0.08] text-gray-100' : 'bg-white border border-gray-200 text-gray-900'}
            `}>
                {/* Search Input */}
                <div className={`flex items-center px-4 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <Search className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'} mr-3`} />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search pages, clients, tickets..."
                        className={`flex-1 bg-transparent border-none outline-none text-lg placeholder-opacity-50 ${isDark ? 'placeholder-gray-500' : 'placeholder-gray-400'}`}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className={`text-xs px-2 py-1 rounded border ${isDark ? 'bg-white/[0.06] border-white/[0.08] text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                        ESC
                    </div>
                </div>

                {/* Results List */}
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {combinedResults.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            {isSearching ? <p className="animate-pulse">Searching...</p> : <p>No results found.</p>}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {combinedResults.map((item, index) => (
                                <button
                                    key={`${item.section}-${item.label}-${index}`}
                                    onClick={() => handleSelect(item)}
                                    className={`
                                        w-full flex items-center px-3 py-3 rounded-lg text-left transition-colors
                                        ${selectedIndex === index
                                            ? (isDark ? 'bg-green-600 text-white' : 'bg-green-500 text-white')
                                            : (isDark ? 'text-gray-300 hover:bg-white/[0.06]' : 'text-gray-700 hover:bg-gray-100')}
                                    `}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <item.icon size={20} className={`mr-3 ${selectedIndex === index ? 'text-white' : 'opacity-70'}`} />
                                    <div className="flex-1">
                                        <div className="font-medium flex items-center gap-2">
                                            {item.label}
                                            {item.subLabel && (
                                                <span className={`text-xs px-1.5 rounded opacity-70 ${selectedIndex === index ? 'bg-white/20' : isDark ? 'bg-white/[0.08] text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                                                    {item.subLabel}
                                                </span>
                                            )}
                                        </div>
                                        {item.section && (
                                            <div className={`text-xs ${selectedIndex === index ? 'text-white/80' : 'text-gray-500'}`}>
                                                {item.section}
                                            </div>
                                        )}
                                    </div>
                                    {selectedIndex === index && (
                                        <span className="text-xs bg-white/20 px-2 py-1 rounded ml-2">Enter</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-4 py-2 border-t text-xs flex justify-between ${isDark ? 'bg-white/[0.03] border-white/[0.06] text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                    <div className="flex gap-4">
                        <span><strong className="font-medium">↑↓</strong> to navigate</span>
                        <span><strong className="font-medium">↵</strong> to select</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
