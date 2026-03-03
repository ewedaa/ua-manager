import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Plus, Trash2, Edit2, X, FolderKanban, Loader2, FileDown, Printer } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

const API = API_BASE_URL;

const STATUSES = ['Active', 'On Hold', 'Completed'];
const statusColors = {
    'Active': 'bg-green-500/15 text-green-400 border-green-500/20',
    'On Hold': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'Completed': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

const tabGlows = {
    '': 'rgba(34, 197, 94, 0.4)',
    'Active': 'rgba(34, 197, 94, 0.4)',
    'On Hold': 'rgba(245, 158, 11, 0.4)',
    'Completed': 'rgba(59, 130, 246, 0.4)',
};

const tabGradients = {
    '': 'linear-gradient(135deg, #22c55e, #10b981)',
    'Active': 'linear-gradient(135deg, #22c55e, #10b981)',
    'On Hold': 'linear-gradient(135deg, #f59e0b, #d97706)',
    'Completed': 'linear-gradient(135deg, #3b82f6, #6366f1)',
};

// 3D Tab Button
const FilterTab = ({ label, isActive, onClick, glowColor, gradient, isDark }) => {
    const ref = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = (y - rect.height / 2) / 12;
        const rotateY = (rect.width / 2 - x) / 12;
        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
        setIsHovered(false);
    };

    return (
        <button
            ref={ref}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className="relative overflow-hidden px-5 py-2.5 rounded-xl text-sm font-medium group"
            style={{
                background: isActive
                    ? gradient
                    : isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6',
                color: isActive ? '#fff' : isDark ? '#9ca3af' : '#4b5563',
                transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.08 : 1})`,
                boxShadow: isActive && isHovered
                    ? `0 12px 30px -5px ${glowColor}, 0 0 15px ${glowColor}50`
                    : isActive
                        ? `0 4px 15px ${glowColor}40`
                        : isHovered
                            ? isDark ? '0 4px 15px rgba(255,255,255,0.05)' : '0 4px 15px rgba(0,0,0,0.08)'
                            : 'none',
                border: isActive ? 'none' : isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                transition: 'transform 0.15s ease-out, box-shadow 0.3s ease, background 0.3s ease, color 0.3s ease',
            }}
        >
            {/* Shimmer */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
            <span className="relative">{label}</span>
        </button>
    );
};

// 3D Project Card
const ProjectCard = ({ project, isDark, onEdit, onDelete }) => {
    const ref = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const cardGlow = {
        'Active': 'rgba(34, 197, 94, 0.3)',
        'On Hold': 'rgba(245, 158, 11, 0.3)',
        'Completed': 'rgba(59, 130, 246, 0.3)',
    };

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = (y - rect.height / 2) / 10;
        const rotateY = (rect.width / 2 - x) / 10;
        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
        setIsHovered(false);
    };

    const glow = cardGlow[project.status] || cardGlow['Active'];

    return (
        <div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className="relative overflow-hidden rounded-2xl p-5 group backdrop-blur-sm cursor-default"
            style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.03 : 1})`,
                boxShadow: isHovered
                    ? `0 25px 50px -12px rgba(0,0,0,0.25), 0 0 25px ${glow}`
                    : isDark ? '0 4px 15px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.05)',
                transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
            }}
        >
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

            {/* Glow */}
            <div
                className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                style={{ background: `radial-gradient(circle at 50% 50%, ${glow}20, transparent 70%)` }}
            />

            <div className="relative">
                <div className="flex items-start justify-between mb-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${statusColors[project.status]}`}>{project.status}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(project)} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-blue-400"><Edit2 size={14} /></button>
                        <button onClick={() => onDelete(project.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{project.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{project.description || 'No description'}</p>
                <p className="text-xs text-gray-400 mt-3">{new Date(project.updated_at || project.created_at).toLocaleDateString()}</p>
            </div>
        </div>
    );
};

export default function ProjectsPage() {
    const { isDark } = useTheme();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', status: 'Active' });
    const [filter, setFilter] = useState('');
    const [error, setError] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    // --- REPLACED LOCALSTORAGE WITH REACT QUERY ---
    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: () => fetch(`${API}/projects/`).then(r => r.json())
    });

    const createMutation = useMutation({
        mutationFn: (newProject) => fetch(`${API}/projects/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProject)
        }).then(r => r.json()),
        onSuccess: () => {
            queryClient.invalidateQueries(['projects']);
            closeModal();
            setError(null);
        },
        onError: (err) => setError('Failed to create project: ' + err.message)
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, ...data }) => fetch(`${API}/projects/${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(r => r.json()),
        onSuccess: () => {
            queryClient.invalidateQueries(['projects']);
            closeModal();
            setError(null);
        },
        onError: (err) => setError('Failed to update project: ' + err.message)
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => fetch(`${API}/projects/${id}/`, { method: 'DELETE' }),
        onSuccess: () => { queryClient.invalidateQueries(['projects']); setDeleteConfirmId(null); },
        onError: (err) => setError('Failed to delete project: ' + err.message)
    });
    // ----------------------------------------------

    const closeModal = () => { setShowModal(false); setEditId(null); setForm({ name: '', description: '', status: 'Active' }); };
    const openEdit = (p) => { setEditId(p.id); setForm({ name: p.name, description: p.description, status: p.status }); setShowModal(true); };

    const handleSave = (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('Project name is required'); return; }
        setError(null);
        if (editId) {
            updateMutation.mutate({ id: editId, ...form });
        } else {
            createMutation.mutate(form);
        }
    };

    const handleDelete = (id) => { setDeleteConfirmId(id); };

    const filtered = projects.filter(p => !filter || p.status === filter);

    if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-green-500" size={32} /></div>;

    return (
        <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <FolderKanban className="text-green-500" size={28} />
                        Projects
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Track your ongoing projects</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={async () => {
                        if (!projects?.length) return;
                        const XLSX = await import('xlsx');
                        const data = filtered.map(p => ({
                            'Project Name': p.name,
                            'Description': p.description || '',
                            'Status': p.status,
                            'Created': new Date(p.created_at).toLocaleDateString()
                        }));
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Projects");
                        XLSX.writeFile(wb, "projects_list.xlsx");
                    }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <FileDown size={18} /> Export
                    </button>
                    <button onClick={() => window.print()} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <Printer size={18} /> Print
                    </button>
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:scale-105 transition-transform duration-200 shadow-lg shadow-green-500/20">
                        <Plus size={18} /> New Project
                    </button>
                </div>
            </div>

            {/* Status Tabs - 3D */}
            <div className="flex gap-2 flex-wrap">
                <FilterTab
                    label={`All (${projects.length})`}
                    isActive={!filter}
                    onClick={() => setFilter('')}
                    glowColor={tabGlows['']}
                    gradient={tabGradients['']}
                    isDark={isDark}
                />
                {STATUSES.map(s => (
                    <FilterTab
                        key={s}
                        label={`${s} (${projects.filter(p => p.status === s).length})`}
                        isActive={filter === s}
                        onClick={() => setFilter(s)}
                        glowColor={tabGlows[s]}
                        gradient={tabGradients[s]}
                        isDark={isDark}
                    />
                ))}
            </div>

            {/* Project Cards - 3D */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Monitor size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No projects yet. Create one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(p => (
                        <ProjectCard
                            key={p.id}
                            project={p}
                            isDark={isDark}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeModal}>
                    <div onClick={e => e.stopPropagation()} className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editId ? 'Edit Project' : 'New Project'}</h3>
                            <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name</label>
                                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200'} outline-none focus:ring-2 focus:ring-green-500`} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200'} outline-none resize-none`} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-gray-200'} outline-none`}>
                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:scale-[1.02] transition-transform flex justify-center">
                                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="animate-spin" /> : (editId ? 'Update' : 'Create')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeleteConfirmId(null)}>
                    <div onClick={e => e.stopPropagation()} className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Project</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Are you sure you want to delete this project? This action cannot be undone.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">Cancel</button>
                            <button onClick={() => deleteMutation.mutate(deleteConfirmId)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white px-5 py-3 rounded-xl shadow-lg shadow-red-500/25 animate-in slide-in-from-bottom-3 duration-300 flex items-center gap-3">
                    <span className="text-sm font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="text-white/80 hover:text-white"><X size={16} /></button>
                </div>
            )}
        </div>
    );
}
