import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Phone, MessageCircle, Users, Loader2, Building2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

const API = API_BASE_URL;

export default function SupportContacts() {
    const { isDark } = useTheme();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: () => fetch(`${API}/clients/`).then(r => r.json()),
    });

    // Extract all contacts with their client info
    const allContacts = clients.flatMap(client =>
        (client.contacts || []).map(contact => ({
            ...contact,
            clientId: client.id,
            clientName: client.name,
            farmName: client.farm_name,
            farmPhone: client.phone,
            whatsappLink: client.whatsapp_link,
        }))
    );

    // Also add the main client phone as a contact
    const mainContacts = clients.map(client => ({
        id: `main-${client.id}`,
        name: client.name,
        phone: client.phone,
        role: 'Primary Contact',
        clientId: client.id,
        clientName: client.name,
        farmName: client.farm_name,
        whatsappLink: client.whatsapp_link,
        isMain: true,
    }));

    const contacts = [...mainContacts, ...allContacts];

    const roles = [...new Set(contacts.map(c => c.role).filter(Boolean))];

    const filtered = contacts.filter(c => {
        const matchSearch = !search ||
            c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.phone?.includes(search) ||
            c.farmName?.toLowerCase().includes(search.toLowerCase());
        const matchRole = !roleFilter || c.role === roleFilter;
        return matchSearch && matchRole;
    });

    // Group by farm
    const grouped = {};
    filtered.forEach(c => {
        if (!grouped[c.farmName]) grouped[c.farmName] = [];
        grouped[c.farmName].push(c);
    });

    return (
        <div className="px-4 pb-4 pt-1 md:px-6 md:pb-6 md:pt-3 space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                    <Phone className="text-green-500" size={28} />
                    Support Contacts
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{contacts.length} contacts across {clients.length} farms</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search name, phone, or farm..."
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'} focus:ring-2 focus:ring-green-500 outline-none`}
                    />
                </div>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={`px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200'} outline-none`}>
                    <option value="">All Roles</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-green-500" size={32} /></div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="text-center py-16 text-gray-400">No contacts found</div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(grouped).map(([farm, farmContacts]) => (
                        <div key={farm} className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-100'}`}>
                            <div className={`px-5 py-3 flex items-center gap-2 ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                                <Building2 size={16} className="text-green-500" />
                                <span className="font-semibold text-sm text-gray-900 dark:text-white">{farm}</span>
                                <span className="text-xs text-gray-400 ml-auto">{farmContacts.length} contact{farmContacts.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                                {farmContacts.map(c => (
                                    <div key={c.id} className={`px-5 py-3 flex items-center gap-4 transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/50'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.isMain ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/15 text-blue-400'}`}>
                                            <Users size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-900 dark:text-gray-200 truncate">{c.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{c.role || 'Contact'}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {c.phone && (
                                                <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors">
                                                    <Phone size={13} /> {c.phone}
                                                </a>
                                            )}
                                            {c.phone && (
                                                <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">
                                                    <MessageCircle size={16} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
