import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useSleepMode } from '../context/SleepModeContext';
import NotificationCenter from './NotificationCenter';
import { Sun, Moon, Plus, Ticket, Users, Sparkles, FileText, Music, VolumeX } from 'lucide-react';

// Shared 3D tilt hook for buttons
const useTiltEffect = () => {
    const ref = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 12;
        const rotateY = (centerX - x) / 12;
        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
        setIsHovered(false);
    };

    return { ref, tilt, isHovered, setIsHovered, handleMouseMove, handleMouseLeave };
};

// Quick Actions Dropdown
const QuickActions = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { isDark } = useTheme();
    const { ref: tiltRef, tilt, isHovered, setIsHovered, handleMouseMove, handleMouseLeave } = useTiltEffect();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const actions = [
        { icon: Ticket, label: 'New Ticket', path: '/new-ticket', color: 'text-blue-500' },
        { icon: Users, label: 'New Client', path: '/clients?action=new', color: 'text-green-500' },
        { icon: FileText, label: 'New Invoice', path: '/invoices', color: 'text-orange-500' },
        { icon: Sparkles, label: 'Ask AI', path: '/ask-ai', color: 'text-purple-500' },
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                ref={tiltRef}
                onClick={() => setIsOpen(!isOpen)}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={handleMouseLeave}
                className="relative overflow-hidden p-2.5 rounded-xl group"
                style={{
                    background: isDark
                        ? 'linear-gradient(135deg, #16a34a, #059669)'
                        : 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: 'white',
                    transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.1 : 1})`,
                    boxShadow: isHovered
                        ? '0 15px 35px -5px rgba(34, 197, 94, 0.4), 0 0 20px rgba(34, 197, 94, 0.2)'
                        : '0 4px 15px rgba(34, 197, 94, 0.2)',
                    transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                <Plus size={20} className={`relative transition-transform duration-300 ${isOpen ? 'rotate-45' : 'group-hover:rotate-90'}`} />
            </button>

            {isOpen && (
                <div className={`absolute top-full right-0 mt-3 w-56 rounded-2xl shadow-xl border overflow-hidden animate-in fade-in slide-in-from-top-2 z-50 ${isDark
                    ? 'bg-gray-900/95 backdrop-blur-xl border-white/[0.08]'
                    : 'bg-white border-gray-100'
                    }`}>
                    <div className={`px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider ${isDark ? 'border-white/[0.06] text-gray-500' : 'border-gray-50 text-gray-400'}`}>
                        Quick Create
                    </div>
                    <div className="p-2 space-y-1">
                        {actions.map((action, idx) => (
                            <Link
                                key={idx}
                                to={action.path}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isDark
                                    ? 'hover:bg-white/[0.06] text-gray-200'
                                    : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'} ${action.color}`}>
                                    <action.icon size={16} />
                                </div>
                                <span className="font-medium text-sm">{action.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Theme Toggle Button
const ThemeToggleButton = () => {
    const { isDark, toggleTheme } = useTheme();
    const { ref, tilt, isHovered, setIsHovered, handleMouseMove, handleMouseLeave } = useTiltEffect();

    return (
        <button
            ref={ref}
            onClick={toggleTheme}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium group"
            style={{
                background: isDark
                    ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                    : 'linear-gradient(135deg, #334155, #0f172a)',
                color: isDark ? '#111827' : '#ffffff',
                transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.08 : 1})`,
                boxShadow: isHovered
                    ? isDark
                        ? '0 15px 35px -5px rgba(245, 158, 11, 0.5), 0 0 20px rgba(245, 158, 11, 0.3)'
                        : '0 15px 35px -5px rgba(51, 65, 85, 0.5), 0 0 20px rgba(51, 65, 85, 0.3)'
                    : isDark
                        ? '0 4px 15px rgba(245, 158, 11, 0.2)'
                        : '0 4px 15px rgba(51, 65, 85, 0.2)',
                transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
            }}
        >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
            <span className={`relative transition-transform duration-500 ${isDark ? 'group-hover:rotate-180' : 'group-hover:-rotate-12'}`}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            {/* Text removed for clean UI */}
        </button>
    );
};

// Break Mode Button Component
const SleepModeButton = () => {
    const { toggleSleepMode } = useSleepMode();
    const { ref, tilt, isHovered, setIsHovered, handleMouseMove, handleMouseLeave } = useTiltEffect();

    return (
        <button
            ref={ref}
            onClick={toggleSleepMode}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white group"
            style={{
                background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                color: 'white',
                transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.08 : 1})`,
                boxShadow: isHovered
                    ? '0 15px 35px -5px rgba(147, 51, 234, 0.5), 0 0 20px rgba(147, 51, 234, 0.3)'
                    : '0 4px 15px rgba(147, 51, 234, 0.2)',
                transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
            }}
        >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
            <Moon size={18} className="relative group-hover:rotate-[-20deg] transition-transform duration-300" />
            {/* Text removed for clean UI */}
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-300 rounded-full animate-ping opacity-75" />
        </button>
    );
};

// Background Music Button
const MusicButton = () => {
    const { ref, tilt, isHovered, setIsHovered, handleMouseMove, handleMouseLeave } = useTiltEffect();
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        audioRef.current = new Audio('/interstellar.mp3');
        audioRef.current.loop = true;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <button
            ref={ref}
            onClick={togglePlay}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className={`relative overflow-hidden flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${isPlaying ? 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
            style={{
                transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.08 : 1})`,
                boxShadow: isHovered
                    ? '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
                    : 'none',
            }}
            title={isPlaying ? "Pause Music" : "Play Music"}
        >
            {isPlaying ? <Music size={18} className="animate-pulse" /> : <VolumeX size={18} />}
            {isPlaying && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                </span>
            )}
        </button>
    );
};

export default function TopBar() {
    return (
        <div className="hidden md:flex sticky top-0 z-30 w-full justify-end items-center gap-2 md:gap-3 px-3 py-2 md:px-6 md:py-2.5 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 animate-in slide-in-from-top-4 fade-in duration-700">
            <QuickActions />
            <NotificationCenter />
            <MusicButton />
            <ThemeToggleButton />
            <SleepModeButton />
        </div>
    );
}

