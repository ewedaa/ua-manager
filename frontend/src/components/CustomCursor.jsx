import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function CustomCursor() {
    const { isDark } = useTheme();
    const dotRef = useRef(null);
    const ringRef = useRef(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isClicking, setIsClicking] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const dot = dotRef.current;
        const ring = ringRef.current;

        if (!dot || !ring) return;

        let mouseX = 0;
        let mouseY = 0;
        let ringX = 0;
        let ringY = 0;

        const handleMouseMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            setIsVisible(true);

            // Dot follows immediately
            dot.style.left = `${mouseX}px`;
            dot.style.top = `${mouseY}px`;
        };

        const handleMouseDown = () => setIsClicking(true);
        const handleMouseUp = () => setIsClicking(false);
        const handleMouseLeave = () => setIsVisible(false);
        const handleMouseEnter = () => setIsVisible(true);

        // Smooth ring follow with lerp (faster = more responsive)
        const animateRing = () => {
            ringX += (mouseX - ringX) * 0.4;
            ringY += (mouseY - ringY) * 0.4;
            ring.style.left = `${ringX}px`;
            ring.style.top = `${ringY}px`;
            requestAnimationFrame(animateRing);
        };

        // Detect hoverable elements
        const handleElementHover = () => {
            const hoverElements = document.querySelectorAll('button, a, input, textarea, select, [role="button"], .cursor-pointer, .hover-glow');

            hoverElements.forEach(el => {
                el.addEventListener('mouseenter', () => setIsHovering(true));
                el.addEventListener('mouseleave', () => setIsHovering(false));
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        document.body.addEventListener('mouseleave', handleMouseLeave);
        document.body.addEventListener('mouseenter', handleMouseEnter);

        animateRing();
        handleElementHover();

        // Re-check for hoverable elements periodically (for dynamically added content)
        const observer = new MutationObserver(handleElementHover);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.removeEventListener('mouseleave', handleMouseLeave);
            document.body.removeEventListener('mouseenter', handleMouseEnter);
            observer.disconnect();
        };
    }, []);

    // Hide on mobile/touch devices
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
        return null;
    }

    return (
        <>
            {/* Cursor Dot */}
            <div
                ref={dotRef}
                className={`fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ${isVisible ? 'opacity-100' : 'opacity-0'
                    } ${isClicking ? 'scale-75' : 'scale-100'}`}
                style={{
                    width: isHovering ? '8px' : '6px',
                    height: isHovering ? '8px' : '6px',
                    backgroundColor: isDark ? '#4ade80' : '#22c55e',
                    borderRadius: '50%',
                    boxShadow: `0 0 ${isHovering ? '20px' : '10px'} ${isDark ? 'rgba(74, 222, 128, 0.6)' : 'rgba(34, 197, 94, 0.5)'}`,
                    transition: 'width 0.2s, height 0.2s, box-shadow 0.2s',
                }}
            />

            {/* Cursor Ring */}
            <div
                ref={ringRef}
                className={`fixed pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'
                    } ${isHovering ? 'scale-150' : 'scale-100'} ${isClicking ? 'scale-90' : ''}`}
                style={{
                    width: '40px',
                    height: '40px',
                    borderColor: isDark ? 'rgba(74, 222, 128, 0.4)' : 'rgba(34, 197, 94, 0.3)',
                    backgroundColor: isHovering
                        ? (isDark ? 'rgba(74, 222, 128, 0.1)' : 'rgba(34, 197, 94, 0.08)')
                        : 'transparent',
                    mixBlendMode: isDark ? 'screen' : 'multiply',
                }}
            />
        </>
    );
}
