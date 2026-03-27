import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';

const SleepModeContext = createContext();

export const useSleepMode = () => {
    const context = useContext(SleepModeContext);
    if (!context) {
        throw new Error('useSleepMode must be used within SleepModeProvider');
    }
    return context;
};

export function SleepModeProvider({ children }) {
    const [isSleepMode, setIsSleepMode] = useState(false);
    const toggleSleepMode = () => setIsSleepMode(v => !v);

    return (
        <SleepModeContext.Provider value={{ isSleepMode, toggleSleepMode }}>
            {children}
        </SleepModeContext.Provider>
    );
}

export function SleepModeOverlay() {
    const { isSleepMode, toggleSleepMode } = useSleepMode();
    const { isDark } = useTheme();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update clock every second while awake
    useEffect(() => {
        if (!isSleepMode) return;
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [isSleepMode]);

    // Lock body scroll when sleep mode is active
    useEffect(() => {
        const style = isSleepMode ? 'hidden' : '';
        document.body.style.overflow = style;
        document.documentElement.style.overflow = style;
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isSleepMode]);

    if (!isSleepMode) return null;

    const timeStr12 = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const [timePart, amPm] = timeStr12.split(' ');
    const [hourPart, minutePart] = timePart.split(':');

    return (
        <div
            className="fixed inset-0 z-[100] cursor-pointer overflow-hidden"
            onClick={toggleSleepMode}
        >
            {/* Base background */}
            <div className={`absolute inset-0 ${isDark ? 'bg-gray-950' : 'bg-gray-900'}`} />

            {/* Subtle gradient overlay */}
            <div className={`absolute inset-0 ${isDark
                ? 'bg-gradient-to-br from-indigo-900/10 via-transparent to-green-900/10'
                : 'bg-gradient-to-br from-blue-50/50 via-transparent to-green-50/50'}`}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

            {/* Centered content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Logo with ambient glow */}
                <div className="relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-green-500/10 blur-[100px] rounded-full" />
                    <img
                        src="/logo.png"
                        alt="Uniform Agri Logo"
                        className="relative w-[500px] h-auto object-contain drop-shadow-2xl animate-float-gentle"
                    />
                </div>

                {/* Clock card */}
                <div className="mt-10 text-center relative">
                    <div className="relative backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl px-10 py-6 shadow-xl">
                        {/* Time */}
                        <div className="flex items-center justify-center gap-1">
                            <span className="text-5xl font-thin tracking-tight text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                                {hourPart}
                            </span>
                            <span className="text-5xl font-thin text-green-400 animate-pulse">:</span>
                            <span className="text-5xl font-thin tracking-tight text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                                {minutePart}
                            </span>
                            <span className="text-xl font-light text-white/50 ml-2 self-end mb-1">{amPm}</span>
                        </div>

                        {/* Gregorian date */}
                        <p className="mt-3 text-sm font-light tracking-wide text-white/40">
                            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>

                        {/* Hijri date */}
                        <p className="mt-1.5 text-xs font-light tracking-wide text-green-400/50">
                            ☪ {new Intl.DateTimeFormat('en-US-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(currentTime)}
                        </p>
                    </div>
                </div>

                <p className="mt-12 text-xs font-medium tracking-[0.3em] uppercase text-white/20 animate-pulse">
                    Click anywhere to wake
                </p>
            </div>
        </div>
    );
}
