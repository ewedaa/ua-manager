import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister } from './lib/queryClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { SleepModeProvider, SleepModeOverlay } from './context/SleepModeContext';
import Sidebar from './components/Sidebar';
import SyncManager from './components/SyncManager';
import CommandPalette from './components/CommandPalette';
import TopBar from './components/TopBar';
import { OfflineIndicator, PWAInstallPrompt } from './components/PWAComponents';
import NotificationToasts from './components/NotificationToasts';
import { Loader2, Menu } from 'lucide-react';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LoginPage       = React.lazy(() => import('./pages/LoginPage'));
const Dashboard       = React.lazy(() => import('./pages/Dashboard'));
const NewTicket       = React.lazy(() => import('./pages/NewTicket'));
const Clients         = React.lazy(() => import('./pages/Clients'));
const Settings        = React.lazy(() => import('./pages/Settings'));
const TicketsPage     = React.lazy(() => import('./pages/TicketsPage'));
const InvoiceMaker    = React.lazy(() => import('./pages/InvoiceMaker'));
const SerialsPage     = React.lazy(() => import('./pages/SerialsPage'));
const PaymentTracker  = React.lazy(() => import('./pages/PaymentTracker'));
const SupportContacts = React.lazy(() => import('./pages/SupportContacts'));
const ProjectsPage    = React.lazy(() => import('./pages/ProjectsPage'));
const TodoPage        = React.lazy(() => import('./pages/TodoPage'));
const DocsPage        = React.lazy(() => import('./pages/DocsPage'));
const Analytics       = React.lazy(() => import('./pages/Analytics'));
const ReportWriter    = React.lazy(() => import('./pages/ReportWriter'));
const ClientDetailPage  = React.lazy(() => import('./pages/ClientDetailPage'));
const StatDetailPage    = React.lazy(() => import('./pages/StatDetailPage'));
const SerialDetailPage  = React.lazy(() => import('./pages/SerialDetailPage'));
const AskAIPage         = React.lazy(() => import('./pages/AskAIPage'));

// ── Page loading spinner ──────────────────────────────────────────────────────
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <Loader2 size={48} className="text-emerald-500 animate-spin" />
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
            </div>
            <p className="text-sm text-gray-400 font-medium tracking-wide animate-pulse">Loading...</p>
        </div>
    </div>
);

// ── Main application shell ────────────────────────────────────────────────────
function AppContent() {
    const { isDark } = useTheme();
    const { isLoggedIn } = useAuth();
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Global keyboard shortcut: Ctrl/Cmd+K → Command Palette
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isLoggedIn) {
        return (
            <Suspense fallback={<PageLoader />}>
                <LoginPage />
            </Suspense>
        );
    }

    return (
        <Router>
            <SyncManager />
            <div className={`min-h-screen relative overflow-x-hidden transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>

                {/* Mobile top bar */}
                <div className={`md:hidden fixed top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between border-b backdrop-blur-md transition-colors duration-300 ${isDark ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Uniform Agri</span>
                    </Link>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className={`p-2 rounded-lg ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <Menu size={24} />
                    </button>
                </div>

                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    isCollapsed={isCollapsed}
                    toggleCollapse={() => setIsCollapsed(c => !c)}
                />

                {/* Mobile backdrop */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                <main className={`relative z-10 transition-[margin-left] duration-300 ml-0 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'} pt-16 md:pt-0 min-h-screen overflow-x-hidden`}>
                    <TopBar />
                    <Suspense fallback={<PageLoader />}>
                        <div className="page-transition-enter">
                            <Routes>
                                <Route path="/"                element={<Dashboard />} />
                                <Route path="/new-ticket"      element={<NewTicket />} />
                                <Route path="/tickets"         element={<TicketsPage />} />
                                <Route path="/projects"        element={<ProjectsPage />} />
                                <Route path="/clients"         element={<Clients />} />
                                <Route path="/clients/:id"     element={<ClientDetailPage />} />
                                <Route path="/invoices"        element={<InvoiceMaker />} />
                                <Route path="/stats/:tileId"   element={<StatDetailPage />} />
                                <Route path="/serials"         element={<SerialsPage />} />
                                <Route path="/serials/:id"     element={<SerialDetailPage />} />
                                <Route path="/payments"        element={<PaymentTracker />} />
                                <Route path="/support"         element={<SupportContacts />} />
                                <Route path="/todo"            element={<TodoPage />} />
                                <Route path="/docs"            element={<DocsPage />} />
                                <Route path="/analytics"       element={<Analytics />} />
                                <Route path="/reports/writer"  element={<ReportWriter />} />
                                <Route path="/ask-ai"          element={<AskAIPage />} />
                                <Route path="/settings"        element={<Settings />} />
                            </Routes>
                        </div>
                    </Suspense>
                </main>
            </div>

            {/* Global overlays */}
            <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
            <SleepModeOverlay />
            <NotificationToasts />
            <OfflineIndicator />
            <PWAInstallPrompt />
        </Router>
    );
}

// ── Provider tree ─────────────────────────────────────────────────────────────
export default function App() {
    return (
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
            <ThemeProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <SleepModeProvider>
                            <AppContent />
                        </SleepModeProvider>
                    </NotificationProvider>
                </AuthProvider>
            </ThemeProvider>
        </PersistQueryClientProvider>
    );
}
