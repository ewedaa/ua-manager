import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus, Trash2, Calendar, GripVertical,
    Loader2, ListTodo, Sparkles, Clock, CheckCircle2, Circle
} from 'lucide-react';
import { API_BASE_URL } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

const API = `${API_BASE_URL}/todos/`;

const priorityConfig = {
    Urgent: { color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', dot: 'bg-red-500' },
    High: { color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30', dot: 'bg-orange-500' },
    Medium: { color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', dot: 'bg-blue-500' },
    Low: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
};

const COLUMNS = [
    {
        id: 'todo',
        label: 'To Do',
        icon: Circle,
        gradient: 'from-slate-500 to-gray-600',
        accent: 'slate',
        dotColor: 'bg-slate-400',
        headerBg: 'bg-slate-500/10',
        borderColor: 'border-slate-500/20',
        dropBg: 'bg-slate-500/5',
    },
    {
        id: 'in_progress',
        label: 'In Progress',
        icon: Clock,
        gradient: 'from-amber-500 to-orange-500',
        accent: 'amber',
        dotColor: 'bg-amber-400',
        headerBg: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        dropBg: 'bg-amber-500/5',
    },
    {
        id: 'done',
        label: 'Done',
        icon: CheckCircle2,
        gradient: 'from-emerald-500 to-green-600',
        accent: 'emerald',
        dotColor: 'bg-emerald-400',
        headerBg: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        dropBg: 'bg-emerald-500/5',
    },
];

/* ─── Task Card ──────────────────────────────────────────── */
function TaskCard({ todo, isDark, onDelete, onDragStart }) {
    const pConfig = priorityConfig[todo.priority] || priorityConfig.Medium;
    const isDone = todo.status === 'done';

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, todo)}
            className={`
                group relative rounded-xl border p-3.5 cursor-grab active:cursor-grabbing
                transition-all duration-200 hover:scale-[1.02] hover:shadow-lg
                ${isDone ? 'opacity-60' : ''}
                ${isDark
                    ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:shadow-black/20'
                    : 'bg-white border-gray-200 hover:shadow-gray-200/60'
                }
            `}
        >
            {/* Drag Handle */}
            <div className="absolute top-3 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
                <GripVertical size={14} className="text-gray-400" />
            </div>

            {/* Task Text */}
            <p className={`text-sm font-medium pr-6 ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                {todo.text}
            </p>

            {/* Meta Row */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pConfig.bg} ${pConfig.color} border ${pConfig.border}`}>
                    {todo.priority}
                </span>
                {todo.due_date && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(todo.due_date).toLocaleDateString()}
                    </span>
                )}

                {/* Delete */}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(todo.id); }}
                    className="ml-auto p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
}

/* ─── Kanban Column ──────────────────────────────────────── */
function KanbanColumn({ column, todos, isDark, onDelete, onDragStart, onDrop, dragOverColumn, setDragOverColumn }) {
    const Icon = column.icon;
    const isOver = dragOverColumn === column.id;

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setDragOverColumn(column.id); }}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => onDrop(e, column.id)}
            className={`
                flex flex-col rounded-2xl border min-h-[300px] transition-all duration-300
                ${isOver
                    ? `ring-2 ring-${column.accent}-500/40 ${column.dropBg} ${isDark ? 'border-white/[0.12]' : 'border-gray-300'}`
                    : isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-200 bg-gray-50/50'
                }
            `}
        >
            {/* Column Header */}
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-t-2xl ${column.headerBg}`}>
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${column.gradient}`}>
                    <Icon size={14} className="text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {column.label}
                </span>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                    {todos.length}
                </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
                {todos.length === 0 ? (
                    <div className={`
                        flex items-center justify-center h-24 rounded-xl border-2 border-dashed
                        text-xs text-gray-400 dark:text-gray-500
                        ${isDark ? 'border-white/[0.06]' : 'border-gray-200'}
                    `}>
                        Drop tasks here
                    </div>
                ) : (
                    todos.map(todo => (
                        <TaskCard
                            key={todo.id}
                            todo={todo}
                            isDark={isDark}
                            onDelete={onDelete}
                            onDragStart={onDragStart}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function TodoPage() {
    const queryClient = useQueryClient();
    const { isDark } = useTheme();
    const [newText, setNewText] = useState('');
    const [newPriority, setNewPriority] = useState('Medium');
    const [newDueDate, setNewDueDate] = useState('');
    const [dragOverColumn, setDragOverColumn] = useState(null);
    const dragItemRef = useRef(null);

    // Fetch all todos (no filter — we split them client-side by status)
    const { data, isLoading } = useQuery({
        queryKey: ['todos'],
        queryFn: async () => {
            const res = await fetch(`${API}?status=all`);
            if (!res.ok) throw new Error('Failed to fetch todos');
            return res.json();
        },
    });

    const todos = data?.todos || [];

    // Create
    const createMutation = useMutation({
        mutationFn: (todo) => fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(todo),
        }).then(r => r.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todos'] });
            setNewText('');
            setNewDueDate('');
        },
    });

    // Update status (drag-and-drop)
    const updateMutation = useMutation({
        mutationFn: ({ id, status }) => fetch(`${API}${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, is_done: status === 'done' }),
        }).then(r => r.json()),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
    });

    // Delete
    const deleteMutation = useMutation({
        mutationFn: (id) => fetch(`${API}${id}/`, { method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
    });

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newText.trim()) return;
        createMutation.mutate({
            text: newText.trim(),
            priority: newPriority,
            due_date: newDueDate || null,
            status: 'todo',
        });
    };

    const handleDragStart = (e, todo) => {
        dragItemRef.current = todo;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e, newStatus) => {
        e.preventDefault();
        setDragOverColumn(null);
        const todo = dragItemRef.current;
        if (todo && todo.status !== newStatus) {
            updateMutation.mutate({ id: todo.id, status: newStatus });
        }
        dragItemRef.current = null;
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
    };

    // Split todos by status
    const columnTodos = {
        todo: todos.filter(t => t.status === 'todo'),
        in_progress: todos.filter(t => t.status === 'in_progress'),
        done: todos.filter(t => t.status === 'done'),
    };

    const completedCount = columnTodos.done.length;

    return (
        <div className="px-4 pb-4 pt-2 md:px-8 md:pb-8 md:pt-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/25">
                        <ListTodo size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                            Task Board
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {completedCount}/{todos.length} complete
                        </p>
                    </div>
                </div>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className={`rounded-2xl border p-5 ${isDark ? 'border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.02]' : 'border-gray-200 bg-white shadow-sm'}`}>
                <div className="flex items-center gap-3 mb-3">
                    <Sparkles size={14} className="text-violet-400" />
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">New Task</span>
                </div>
                <div className="flex gap-3 items-start flex-wrap">
                    <input
                        type="text"
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        placeholder="What needs to be done?"
                        className={`flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${isDark ? 'bg-white/5 border-white/10 text-gray-200 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                    />
                    <select
                        value={newPriority}
                        onChange={e => setNewPriority(e.target.value)}
                        className={`px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                    <input
                        type="date"
                        value={newDueDate}
                        onChange={e => setNewDueDate(e.target.value)}
                        className={`px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                    <button
                        type="submit"
                        disabled={createMutation.isPending || !newText.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300 disabled:opacity-40 flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add
                    </button>
                </div>
            </form>

            {/* Kanban Board */}
            {isLoading ? (
                <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-400" />
                    <p className="text-gray-400 mt-3 text-sm">Loading tasks...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {COLUMNS.map(column => (
                        <KanbanColumn
                            key={column.id}
                            column={column}
                            todos={columnTodos[column.id]}
                            isDark={isDark}
                            onDelete={handleDelete}
                            onDragStart={handleDragStart}
                            onDrop={handleDrop}
                            dragOverColumn={dragOverColumn}
                            setDragOverColumn={setDragOverColumn}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
