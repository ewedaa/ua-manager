import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Info } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const colorClasses = {
    green: 'from-green-500 to-emerald-600 shadow-green-500/25',
    blue: 'from-blue-500 to-indigo-600 shadow-blue-500/25',
    orange: 'from-orange-500 to-amber-600 shadow-orange-500/25',
    red: 'from-red-500 to-rose-600 shadow-red-500/25',
    purple: 'from-purple-500 to-violet-600 shadow-purple-500/25',
    cyan: 'from-cyan-500 to-teal-600 shadow-cyan-500/25',
    amber: 'from-amber-500 to-yellow-600 shadow-amber-500/25',
    gray: 'from-gray-500 to-slate-600 shadow-gray-500/25',
};

const glowColors = {
    green: 'rgba(34, 197, 94, 0.4)',
    blue: 'rgba(59, 130, 246, 0.4)',
    orange: 'rgba(249, 115, 22, 0.4)',
    red: 'rgba(239, 68, 68, 0.4)',
    purple: 'rgba(168, 85, 247, 0.4)',
    cyan: 'rgba(6, 182, 212, 0.4)',
    amber: 'rgba(245, 158, 11, 0.4)',
    gray: 'rgba(107, 114, 128, 0.4)',
};

export default function StatCard({ icon: Icon, label, value, subValue, color = 'green', trend, to, onClick, info }) {
    const navigate = useNavigate();
    const cardRef = useRef(null);
    const infoBtnRef = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const { isDark } = useTheme();

    const handleClick = () => {
        if (onClick) onClick();
        else if (to) navigate(to);
    };

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
        setIsHovered(false);
    };

    const handleInfoClick = (e) => {
        e.stopPropagation();
        if (infoBtnRef.current) {
            const rect = infoBtnRef.current.getBoundingClientRect();
            setTooltipPos({
                top: rect.bottom + 8,
                left: Math.max(12, Math.min(rect.left, window.innerWidth - 280)),
            });
        }
        setShowInfo(!showInfo);
    };

    // Close tooltip on outside click
    useEffect(() => {
        if (!showInfo) return;
        const handleClickOutside = (e) => {
            if (infoBtnRef.current && !infoBtnRef.current.contains(e.target)) {
                setShowInfo(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showInfo]);

    const glow = glowColors[color] || glowColors.green;

    return (
        <div
            ref={cardRef}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className="relative overflow-hidden rounded-xl md:rounded-2xl p-3 md:p-6 transition-all duration-300 cursor-pointer group"
            style={{
                background: isDark
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(255,255,255,0.8)',
                border: isDark
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid rgba(0,0,0,0.06)',
                transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.03 : 1})`,
                boxShadow: isHovered
                    ? `0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 25px ${glow}`
                    : isDark
                        ? '0 4px 15px rgba(0, 0, 0, 0.2)'
                        : '0 4px 15px rgba(0, 0, 0, 0.05)',
                transition: 'transform 0.15s ease-out, box-shadow 0.3s ease, background 0.3s ease',
            }}
        >
            {/* Animated Gradient Accent */}
            <div className={`absolute top-0 right-0 w-20 md:w-32 h-20 md:h-32 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-bl-full transform group-hover:scale-150 group-hover:opacity-20 transition-all duration-700`} />

            {/* Info Button */}
            {info && (
                <button
                    ref={infoBtnRef}
                    onClick={handleInfoClick}
                    className={`absolute top-2 left-2 z-20 p-1 rounded-full transition-all duration-200 ${showInfo
                            ? isDark ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                            : isDark ? 'bg-white/[0.06] text-gray-500 hover:bg-white/15 hover:text-gray-300' : 'bg-gray-100/80 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                        }`}
                    title="What is this?"
                >
                    <Info size={13} />
                </button>
            )}

            {/* Info Tooltip Portal */}
            {info && showInfo && createPortal(
                <div
                    className={`fixed z-[9999] w-64 p-3.5 rounded-xl shadow-2xl border text-sm leading-relaxed animate-in fade-in zoom-in-95 duration-200 ${isDark
                            ? 'bg-gray-800/95 backdrop-blur-xl border-white/10 text-gray-200 shadow-black/50'
                            : 'bg-white border-gray-200 text-gray-700 shadow-gray-300/50'
                        }`}
                    style={{ top: tooltipPos.top, left: tooltipPos.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start gap-2.5">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 bg-gradient-to-br ${colorClasses[color]}`}>
                            <Info size={12} className="text-white" />
                        </div>
                        <div>
                            <p className={`text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                            <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{info}</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Premium Shimmer effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

            {/* Glow effect */}
            <div
                className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${glow}20, transparent 70%)`,
                }}
            />

            <div className="relative flex items-start justify-between" style={{ transform: 'translateZ(30px)' }}>
                <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5 md:mb-1 truncate">{label}</p>
                    <p className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
                    {subValue && (
                        <p className="text-[10px] md:text-sm text-gray-400 dark:text-gray-500 mt-0.5 md:mt-1 flex items-center gap-1 truncate">
                            {trend === 'up' && <TrendingUp size={12} className="text-green-500 shrink-0" />}
                            {trend === 'down' && <TrendingUp size={12} className="text-red-500 rotate-180 shrink-0" />}
                            {subValue}
                        </p>
                    )}
                </div>
                <div
                    className={`p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg transform transition-all duration-300 shrink-0 ml-2`}
                    style={{
                        transform: isHovered ? 'scale(1.1) rotate(3deg) translateZ(40px)' : 'translateZ(20px)',
                    }}
                >
                    <Icon className="text-white w-4 h-4 md:w-6 md:h-6" />
                </div>
            </div>
        </div>
    );
}

