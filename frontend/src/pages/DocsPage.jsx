import React, { useState } from 'react';
import { BookOpen, Search, ChevronDown, ChevronRight, Keyboard, HelpCircle, Layers, Users, Ticket as TicketIcon, FileText, BarChart3, Settings, Download, Monitor, Phone, ClipboardList, Barcode, CreditCard } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Helper to get image URL (removed DocsScreenshot component)
const getSlug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const ImageWithFallback = ({ item }) => {
    const slug = getSlug(item.image.title);
    const localSrc = `/docs/${slug}.png`;
    const placeholderSrc = `https://placehold.co/800x450/111827/4ade80/png?text=${encodeURIComponent(item.image.title)}&font=roboto`;
    const [src, setSrc] = React.useState(localSrc);

    return (
        <img
            src={src}
            alt={`${item.image.title} Screenshot`}
            className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setSrc(placeholderSrc)}
        />
    );
};


const sections = [
    {
        title: 'Getting Started',
        icon: Layers,
        items: [
            {
                q: 'What is UA Manager?',
                a: 'UA Manager (Uniform Agri Manager) is the centralized internal management portal for 4Genetics/Uniform Agri. It is designed to streamline the entire lifecycle of dairy farm client management, from onboarding and subscription tracking to technical support and billing. It consolidates multiple workflows—Client Management, Support Tickets, Invoicing, Hardware Tracking, and Project Management—into a single, high-performance interface.'
            },
            {
                q: 'How do I navigate the application?',
                a: 'The application features a collapsible sidebar on the left for primary navigation. Hovering over any link instantly pre-loads the data for that page, ensuring zero-latency transitions. You can also use the global Command Palette by pressing "Ctrl + K" (or Cmd+K on Mac) to instantly search for and jump to any page, client, or action.',
                image: { title: 'Navigation Sidebar', icon: Layers }
            },
            {
                q: 'What are the system requirements?',
                a: 'UA Manager is a Progressive Web App (PWA). It works on any modern browser (Chrome, Edge, Firefox, Safari) and can be installed directly onto your desktop or mobile device for an app-like experience. It requires an active internet connection for real-time data sync, but includes limited offline capabilities for viewing cached data.'
            },
        ]
    },
    {
        title: 'Dashboard & Analytics',
        icon: BarChart3,
        items: [
            {
                q: 'What data is shown on the Dashboard?',
                a: 'The Dashboard provides a high-level overview of business health. Key Performance Indicators (KPIs) include: Total Active Clients, Tickets needing attention (Open/In Progress), Monthly Revenue (in EGP), and Active Projects. It also features a "Recent Activity" feed tracking the latest system actions and an "Expiring Soon" alert section for subscriptions ending within 60 days.',
                image: { title: 'Dashboard Overview', icon: BarChart3 }
            },
            {
                q: 'How is revenue calculated?',
                a: 'The Revenue chart displays a 6-month trend of income based on "Paid to Us" invoices. It aggregates the total of all invoices marked as paid within each month, helping track financial growth and seasonality.'
            },
        ]
    },
    {
        title: 'Client Management',
        icon: Users,
        items: [
            {
                q: 'How do I register a new farm/client?',
                a: 'Navigate to the "Clients" page and click the "+ New Client" button. You will need to provide the Farm Name, Contact Person, Phone Number, and Region. You can also assign specific software modules (e.g., Herd Management, Mating) and set the subscription Start/End dates immediately.'
            },
            {
                q: 'How do subscriptions work?',
                a: 'Each client has a subscription validity period defined by Start Date and End Date. The system automatically calculates the remaining duration. When a subscription is within 60 days of expiry, the client is flagged with an amber "Expiring Soon" badge. If the date passes, they are marked with a red "Expired" badge. Renewals can be processed via the Invoice Maker.',
                image: { title: 'Client Details & Subscription', icon: Users }
            },
            {
                q: 'Can I export client data?',
                a: 'Yes. On the Clients page, click the "Export" button to download a full .xlsx (Excel) report of all clients, including their contact details, subscription status, and active modules. The exporter is lazy-loaded to keep the app fast.'
            },
        ]
    },
    {
        title: 'Support Ticket System',
        icon: TicketIcon,
        items: [
            {
                q: 'How does the ticketing workflow operate?',
                a: 'Tickets track technical issues and requests. The status workflow is: OPEN (New issue) → IN PROGRESS (Currently being worked on) → RESOLVED (Fixed but pending verification) → CLOSED (Verified and complete). Each status change is logged.',
                image: { title: 'Ticket Board', icon: TicketIcon }
            },
            {
                q: 'How do I prioritize urgent issues?',
                a: 'When creating or editing a ticket, you can assign a Priority level: Low, Medium, High, or Urgent. High and Urgent tickets are highlighted visually to ensure immediate attention. You can filter the ticket list by priority to focus on critical tasks.'
            },
            {
                q: 'What is "Inline Editing"?',
                a: 'To speed up workflow, you can edit a ticket’s Status or Priority directly from the list view without opening the full details modal. Just click the status badge to cycle through states.'
            },
        ]
    },
    {
        title: 'Invoicing & Payments',
        icon: FileText,
        items: [
            {
                q: 'How do I generate an invoice?',
                a: 'Go to the "Invoice Maker". Select an existing client (details auto-fill), choose the Invoice Type (Renewal, Hardware Purchase, Service), and add line items. You can select specific Livestock Types (Cows, Buffalo, Goats, etc.) included in the license. The system calculates the total. Once saved, you can generate a professional PDF invoice with one click.',
                image: { title: 'Invoice Creator', icon: FileText }
            },
            {
                q: 'What is the Payment Tracker?',
                a: 'The Payment Tracker (accessible via sidebar) gives a financial breakdown of all invoices. It tracks "Inbound" payments (Client pays us) and "Outbound" payments (We pay Uniform Agri HQ). It calculates the Net Balance to ensure profitability is tracked per transaction.'
            },
        ]
    },
    {
        title: 'Hardware & Serials',
        icon: Barcode,
        items: [
            {
                q: 'What is tracked in 4Genetics Serials?',
                a: 'This section tracks active hardware units installed at client farms. Product types include Dairy Cows, Dairy Buffalos, Fattening, and Sheep and Goat. Each item is logged with a unique Serial Number and assigned to a specific Client. This is crucial for warranty tracking and technical support.',
                image: { title: 'Serial Number Tracking', icon: Barcode }
            },
        ]
    },
    {
        title: 'Projects & Tasks',
        icon: Monitor,
        items: [
            {
                q: 'How are Projects different from Tickets?',
                a: 'Tickets are for reactive support issues. Projects are for long-term initiatives (e.g., "Deploying New Cloud Server" or "Q3 Marketing Campaign"). Projects have statuses like Active, On Hold, and Completed, and allow for broader tracking of internal company goals.'
            },
            {
                q: 'What is "My To-Do"?',
                a: 'The To-Do section is a personal task manager for the logged-in admin. It allows you to create quick, checklist-style tasks with due dates and priorities. Unlike tickets, these are typically self-assigned notes or reminders.',
                image: { title: 'To-Do Task List', icon: ClipboardList }
            },
        ]
    },
    {
        title: 'System Settings',
        icon: Settings,
        items: [
            {
                q: 'How do I switch themes?',
                a: 'Click the Sun/Moon icon in the top bar to toggle between Light Mode and Dark Mode. The interface instantly adapts, with carefully tuned contrast ratios for eye comfort in both environments.'
            },
            {
                q: 'Is my data secure?',
                a: 'UA Manager runs on a secure Django backend. While the frontend provides Open Access for speed within the internal network, the API validates all requests. Regular backups of the database ensure data integrity.'
            },
        ]
    },
];

export default function DocsPage() {
    const { isDark } = useTheme();
    const [search, setSearch] = useState('');
    const [openSections, setOpenSections] = useState(new Set(sections.map((_, i) => i))); // Default all open for better printability

    const toggleSection = (idx) => {
        setOpenSections(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    const handlePrint = () => {
        // Expand all sections before printing
        setOpenSections(new Set(sections.map((_, i) => i)));
        // Wait for state update then print
        setTimeout(() => window.print(), 100);
    };

    const filteredSections = sections.map(section => ({
        ...section,
        items: section.items.filter(item =>
            !search ||
            item.q.toLowerCase().includes(search.toLowerCase()) ||
            item.a.toLowerCase().includes(search.toLowerCase())
        )
    })).filter(s => s.items.length > 0);

    return (
        <div className="px-4 pb-4 pt-2 md:px-8 md:pb-8 md:pt-24 space-y-6 max-w-5xl mx-auto page-container">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <BookOpen className="text-green-500" size={32} />
                        Documentation
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Comprehensive guide to the UA Manager ecosystem</p>
                </div>

                <div className="flex gap-3 no-print">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:scale-105 transition-transform duration-200 shadow-lg shadow-blue-500/20"
                    >
                        <Download size={18} /> Download PDF / Print
                    </button>
                </div>
            </div>

            {/* Search - Hidden on Print */}
            <div className="relative no-print">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); if (e.target.value) setOpenSections(new Set(filteredSections.map((_, i) => i))); }}
                    placeholder="Search for answers..."
                    className={`w-full pl-11 pr-4 py-4 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'} focus:ring-2 focus:ring-green-500 outline-none text-lg shadow-sm`}
                />
            </div>

            {/* Sections */}
            <div className="space-y-6">
                {filteredSections.map((section, idx) => (
                    <div key={section.title} className={`rounded-2xl border overflow-hidden avoid-break ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <button onClick={() => toggleSection(idx)} className={`w-full flex items-center gap-4 px-6 py-5 text-left transition-colors ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'}`}>
                            <div className={`p-2 rounded-lg ${isDark ? 'bg-white/[0.05]' : 'bg-green-50'}`}>
                                <section.icon size={24} className="text-green-500 shrink-0" />
                            </div>
                            <span className="font-bold text-xl text-gray-900 dark:text-white flex-1">{section.title}</span>
                            <span className="text-sm font-medium text-gray-400 mr-2 no-print">{section.items.length} topics</span>
                            <div className="no-print">
                                {openSections.has(idx) ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                            </div>
                        </button>

                        {(openSections.has(idx) || window.matchMedia('print').matches) && (
                            <div className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-gray-50'}`}>
                                {section.items.map((item, i) => (
                                    <div key={i} className={`px-6 py-6 ${i > 0 ? `border-t ${isDark ? 'border-white/[0.04]' : 'border-gray-50'}` : ''} avoid-break`}>
                                        <div className="flex items-start gap-3 mb-3">
                                            <HelpCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
                                            <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{item.q}</h4>
                                        </div>
                                        <p className="text-base text-gray-600 dark:text-gray-400 ml-9 leading-7 text-justify mb-4">{item.a}</p>

                                        {/* Screenshot Image */}
                                        {item.image && (
                                            <div className="ml-9 mt-4 mb-6 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700 group no-print">
                                                <ImageWithFallback item={item} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10 text-center text-gray-400 text-sm hidden print:block">
                <p>Generated by UA Manager • {new Date().toLocaleDateString()}</p>
                <p>4Genetics / Uniform Agri Internal Documentation</p>
            </div>
        </div>
    );
}
