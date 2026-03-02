import React, { useEffect, useState, createContext, useContext, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister } from './lib/queryClient';
import { API_BASE_URL } from './lib/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import { Moon, Menu, Loader2 } from 'lucide-react';
import { OfflineIndicator, PWAInstallPrompt } from './components/PWAComponents';
import NotificationToasts from './components/NotificationToasts';
import { NotificationProvider } from './context/NotificationContext';

// Lazy Load Pages for Performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const NewTicket = React.lazy(() => import('./pages/NewTicket'));
const Clients = React.lazy(() => import('./pages/Clients'));
const Settings = React.lazy(() => import('./pages/Settings'));
const TicketsPage = React.lazy(() => import('./pages/TicketsPage'));
const InvoiceMaker = React.lazy(() => import('./pages/InvoiceMaker'));
const SerialsPage = React.lazy(() => import('./pages/SerialsPage'));
const PaymentTracker = React.lazy(() => import('./pages/PaymentTracker'));
const SupportContacts = React.lazy(() => import('./pages/SupportContacts'));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage'));
const TodoPage = React.lazy(() => import('./pages/TodoPage'));
const DocsPage = React.lazy(() => import('./pages/DocsPage'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const ReportWriter = React.lazy(() => import('./pages/ReportWriter'));
const ClientDetailPage = React.lazy(() => import('./pages/ClientDetailPage'));


// Loading Screen Component with Premium Animation
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

// Sleep Mode Context
const SleepModeContext = createContext();

export const useSleepMode = () => {
  const context = useContext(SleepModeContext);
  if (!context) {
    throw new Error('useSleepMode must be used within SleepModeProvider');
  }
  return context;
};

// Sleep Mode Overlay Component
const SleepModeOverlay = () => {
  const { isSleepMode, toggleSleepMode } = useSleepMode();
  const { isDark } = useTheme();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Update time every second
  React.useEffect(() => {
    if (!isSleepMode) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isSleepMode]);

  // Hide body scrollbar when in sleep mode
  React.useEffect(() => {
    if (isSleepMode) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isSleepMode]);

  if (!isSleepMode) return null;

  return (
    <div
      className="fixed inset-0 z-[100] cursor-pointer overflow-hidden"
      onClick={toggleSleepMode}
    >
      {/* Solid background - completely opaque */}
      <div className={`absolute inset-0 ${isDark ? 'bg-gray-950' : 'bg-gray-900'}`} />

      {/* Floating Background - on top of solid bg */}
      <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-indigo-900/10 via-transparent to-green-900/10' : 'bg-gradient-to-br from-blue-50/50 via-transparent to-green-50/50'}`} />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

      {/* Centered Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Logo with glow */}
        <div className="relative">
          {/* Glow effect behind logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-green-500/10 blur-[100px] rounded-full" />

          <img
            src="/logo.png"
            alt="Uniform Agri Logo"
            className="relative w-[500px] h-auto object-contain drop-shadow-2xl animate-float-gentle"
          />
        </div>

        {/* Time Display - Compact */}
        <div className="mt-10 text-center relative">
          {/* Glass card container */}
          <div className="relative backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl px-10 py-6 shadow-xl">
            {/* Main Time */}
            <div className="flex items-center justify-center gap-1">
              <span className="text-5xl font-thin tracking-tight text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).split(':')[0]}
              </span>
              <span className="text-5xl font-thin text-green-400 animate-pulse">:</span>
              <span className="text-5xl font-thin tracking-tight text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).split(':')[1]?.split(' ')[0]}
              </span>
              <span className="text-xl font-light text-white/50 ml-2 self-end mb-1">
                {currentTime.toLocaleTimeString([], { hour: '2-digit' }).includes('AM') ? 'AM' : 'PM'}
              </span>
            </div>

            {/* Date - Gregorian */}
            <p className="mt-3 text-sm font-light tracking-wide text-white/40">
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {/* Date - Hijri */}
            <p className="mt-1.5 text-xs font-light tracking-wide text-green-400/50">
              ☪ {new Intl.DateTimeFormat('en-US-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(currentTime)}
            </p>
          </div>
        </div>

        {/* Click to wake text */}
        <p className="mt-12 text-xs font-medium tracking-[0.3em] uppercase text-white/20 animate-pulse">
          Click anywhere to wake
        </p>
      </div>
    </div>
  );
};

const SyncManager = () => {
  useEffect(() => {
    const syncTickets = async () => {
      if (navigator.onLine) {
        const offlineTickets = JSON.parse(localStorage.getItem('offline_tickets') || '[]');

        if (offlineTickets.length > 0) {
          console.log('Syncing offline tickets...', offlineTickets);

          for (const ticket of offlineTickets) {
            try {
              const { id, timestamp, ...payload } = ticket;

              const res = await fetch(`${API_BASE_URL}/tickets/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });

              if (res.ok) {
                const current = JSON.parse(localStorage.getItem('offline_tickets') || '[]');
                const newQueue = current.filter(t => t.id !== ticket.id);
                localStorage.setItem('offline_tickets', JSON.stringify(newQueue));
              }
            } catch (err) {
              console.error('Failed to sync ticket', ticket.id, err);
            }
          }
        }
      }
    };

    window.addEventListener('online', syncTickets);
    syncTickets();

    return () => window.removeEventListener('online', syncTickets);
  }, []);

  return null;
};

import CommandPalette from './components/CommandPalette';
import TopBar from './components/TopBar';

function AppContent() {
  const { isLoggedIn } = useAuth();
  const { isDark } = useTheme();
  const [isSleepMode, setIsSleepMode] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSleepMode = () => setIsSleepMode(!isSleepMode);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle Command Palette with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  return (
    <SleepModeContext.Provider value={{ isSleepMode, toggleSleepMode }}>
      <Router>
        <SyncManager />
        <div className={`min-h-screen relative overflow-x-hidden transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>

          {/* Mobile Header / Menu Button */}
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
            toggleCollapse={() => setIsCollapsed(!isCollapsed)}
          />

          {/* Mobile Backdrop */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <main className={`relative z-10 transition-all duration-300 ml-0 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'} pt-16 md:pt-0 min-h-screen overflow-x-hidden`}>
            <TopBar />
            <Suspense fallback={<PageLoader />}>
              <div className="page-transition-enter">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/new-ticket" element={<NewTicket />} />
                  <Route path="/tickets" element={<TicketsPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                  <Route path="/invoices" element={<InvoiceMaker />} />
                  <Route path="/serials" element={<SerialsPage />} />
                  <Route path="/payments" element={<PaymentTracker />} />
                  <Route path="/support" element={<SupportContacts />} />
                  <Route path="/todo" element={<TodoPage />} />
                  <Route path="/docs" element={<DocsPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/reports/writer" element={<ReportWriter />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </Suspense>
          </main>
        </div>


        {/* Command Palette */}
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />

        {/* Sleep Mode Overlay */}
        <SleepModeOverlay />

        {/* Notification Toasts */}
        <NotificationToasts />

        {/* PWA Components */}
        <OfflineIndicator />
        <PWAInstallPrompt />
      </Router>
    </SleepModeContext.Provider>
  );
}

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
