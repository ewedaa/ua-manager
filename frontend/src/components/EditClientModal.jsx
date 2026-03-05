import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

const updateClient = async (updatedClient) => {
    const response = await fetch(`${API_BASE_URL}/clients/${updatedClient.id}/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedClient),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData) || 'Failed to update client');
    }
    return response.json();
};

const fetchModules = async () => {
    const response = await fetch(`${API_BASE_URL}/subscription-modules/`);
    if (!response.ok) throw new Error('Failed to fetch modules');
    return response.json();
};

export default function EditClientModal({ client, onClose }) {
    const queryClient = useQueryClient();
    const { isDark } = useTheme();
    const [formData, setFormData] = useState({ ...client });
    const [error, setError] = useState(null);

    const { data: rawModules = [] } = useQuery({
        queryKey: ['subscription-modules'],
        queryFn: fetchModules,
    });

    const availableModules = React.useMemo(() => {
        return [...rawModules].filter(m => m.is_active !== false).sort((a, b) => {
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
    }, [rawModules]);

    const mutation = useMutation({
        mutationFn: updateClient,
        onSuccess: () => {
            queryClient.invalidateQueries(['clients']);
            onClose();
        },
        onError: (err) => {
            setError(err.message);
        },
    });

    const handleChange = (e) => {
        let { name, value } = e.target;
        if (name === 'serial_number') {
            value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            value = value.match(/.{1,4}/g)?.join('-') || '';
            value = value.substring(0, 24);
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.subscription_start_date && formData.subscription_end_date &&
            formData.subscription_end_date < formData.subscription_start_date) {
            setError('Subscription end date must be after start date.');
            return;
        }

        // Only send writable fields to avoid issues with nested read-only objects
        const payload = {
            id: formData.id,
            farm_name: formData.farm_name,
            phone: formData.phone,
            serial_number: formData.serial_number,
            livestock_type: formData.livestock_type || 'Dairy Cows',
            subscription_modules: formData.subscription_modules,
            general_notes: formData.general_notes,
            subscription_start_date: formData.subscription_start_date || null,
            subscription_end_date: formData.subscription_end_date || null,
            is_demo: formData.is_demo || false,
            demo_start_date: formData.demo_start_date || null,
            demo_end_date: formData.demo_end_date || null,
        };
        mutation.mutate(payload);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
            <div className={`rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-900/95 backdrop-blur-xl border border-white/[0.08]' : 'bg-white'}`}>
                <div className={`p-6 border-b flex justify-between items-center sticky top-0 z-10 ${isDark ? 'border-white/[0.06] bg-gray-900/95 backdrop-blur-xl' : 'border-gray-100 bg-white'}`}>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit Client Details</h2>
                    <button onClick={onClose} className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className={`m-6 mb-0 p-4 rounded-lg flex items-start gap-3 text-sm ${isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-700'}`}>
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Farm Name */}
                    <div>
                        <label className={`block text-xs font-bold uppercase mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Farm Name</label>
                        <input
                            type="text"
                            name="farm_name"
                            value={formData.farm_name || ''}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'border-gray-300 bg-white'}`}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Serial Number */}
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Serial Number</label>
                            <input
                                type="text"
                                name="serial_number"
                                value={formData.serial_number || ''}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'border-gray-300 bg-white'}`}
                            />
                        </div>

                        {/* Livestock Type */}
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Livestock Type *</label>
                            <select
                                name="livestock_type"
                                value={formData.livestock_type || 'Dairy Cows'}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'border-gray-300 bg-white'}`}
                            >
                                <option value="Dairy Cows">Dairy Cows</option>
                                <option value="Dairy Buffalos">Dairy Buffalos</option>
                                <option value="Fattening">Fattening</option>
                                <option value="Sheep and Goat">Sheep and Goat</option>
                            </select>
                        </div>
                    </div>

                    {/* Subscription Modules (Multi-select from API) */}
                    <div>
                        <label className={`block text-xs font-bold uppercase mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Subscription Modules</label>
                        <div className={`grid grid-cols-2 gap-2 p-3 rounded-lg border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-100'}`}>
                            {availableModules.length > 0 ? availableModules.map((mod) => (
                                <label key={mod.id} className={`flex items-center space-x-2 text-sm cursor-pointer p-1.5 rounded transition-colors ${isDark ? 'text-gray-300 hover:bg-white/[0.06]' : 'text-gray-700 hover:bg-gray-100'}`}>
                                    <input
                                        type="checkbox"
                                        checked={(formData.subscription_modules || '').includes(mod.name)}
                                        onChange={(e) => {
                                            const currentModules = (formData.subscription_modules || '').split(',').map(s => s.trim()).filter(Boolean);
                                            let newModules;

                                            if (e.target.checked) {
                                                newModules = [...currentModules, mod.name];

                                                // Cumulative selection for Big farm modules
                                                if (mod.name.includes('Big farm module')) {
                                                    const getCows = (name) => {
                                                        const match = name.match(/(\d+)/);
                                                        return match ? parseInt(match[1], 10) : 0;
                                                    };
                                                    const targetCows = getCows(mod.name);
                                                    const lowerTierNames = availableModules
                                                        .filter(m => m.name.includes('Big farm module') && getCows(m.name) < targetCows)
                                                        .map(m => m.name);

                                                    newModules = Array.from(new Set([...newModules, ...lowerTierNames]));
                                                }
                                            } else {
                                                newModules = currentModules.filter(m => m !== mod.name);
                                            }
                                            setFormData({ ...formData, subscription_modules: newModules.sort().join(', ') });
                                        }}
                                        className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300"
                                    />
                                    <span>{mod.name}</span>
                                </label>
                            )) : (
                                <p className="col-span-2 text-xs text-gray-400 italic">No modules configured. Add them in Admin.</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Additional Notes</label>
                        <textarea
                            name="general_notes"
                            value={formData.general_notes || ''}
                            onChange={handleChange}
                            placeholder="Add notes..."
                            rows={3}
                            className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                        />
                    </div>

                    {/* Toggles */}
                    <div className={`flex items-center gap-6 p-4 rounded-lg border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-100'}`}>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="is_demo"
                                checked={formData.is_demo}
                                onChange={(e) => setFormData(p => ({ ...p, is_demo: e.target.checked }))}
                                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 bg-white dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                            />
                            <span className={`text-sm font-medium transition-colors ${isDark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>Is Demo Farm?</span>
                        </label>
                    </div>

                    {/* Subscription Dates */}
                    <div className={`grid grid-cols-2 gap-4 p-4 rounded-lg border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-100'}`}>
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Start Date</label>
                            <input
                                type="date"
                                name="subscription_start_date"
                                value={formData.subscription_start_date}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'border-gray-300 bg-white'}`}
                                required
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>End Date</label>
                            <input
                                type="date"
                                name="subscription_end_date"
                                value={formData.subscription_end_date}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'border-gray-300 bg-white'}`}
                                required
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex justify-end gap-3 pt-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? 'text-gray-400 hover:bg-white/[0.06] hover:text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {mutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
