import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

export default function AskAI() {
    const { isDark } = useTheme();
    const { addToast } = useNotifications();
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('ai_chat_history');
        if (saved) return JSON.parse(saved);
        return [{ id: 1, text: "Hello! I am your AI Assistant. I have read access to your clients, invoices, and tickets. How can I help you manage your business today?", sender: 'bot' }];
    });
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
        localStorage.setItem('ai_chat_history', JSON.stringify(messages));
    }, [messages]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!query.trim()) return;

        const userMsg = { id: Date.now(), text: query, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setQuery('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/ask-agent/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: userMsg.text })
            });
            const data = await res.json();
            
            const botMsg = { 
                id: Date.now() + 1, 
                text: data.answer || data.response || "I'm sorry, I couldn't process that request.", 
                sender: 'bot' 
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error(error);
            if (addToast) addToast('Failed to reach AI agent', 'error');
            setMessages(prev => [...prev, { id: Date.now() + 1, text: "Connection error. Please try again.", sender: 'bot', error: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        if(confirm('Clear all chat history?')) {
            setMessages([{ id: 1, text: "Hello! I am your AI Assistant. I have read access to your clients, invoices, and tickets. How can I help you manage your business today?", sender: 'bot' }]);
        }
    };

    return (
        <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4 h-[calc(100vh-64px)] md:h-[calc(100vh-20px)] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-gray-900 dark:text-white">
                        <Sparkles className="text-purple-500" size={28} />
                        UA AI Assistant
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Ask questions about your data, metrics, or request summaries.</p>
                </div>
                <button 
                    onClick={clearChat} 
                    className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-white/[0.04] text-gray-400 hover:text-red-400 hover:bg-white/[0.08]' : 'bg-gray-100 text-gray-500 hover:text-red-500 hover:bg-gray-200'} `}
                    title="Clear Chat"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            <div className={`flex-1 overflow-hidden flex flex-col rounded-2xl border backdrop-blur-sm ${isDark ? 'bg-gray-900/50 border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'}`}>
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-purple-500/20">
                    {messages.map((msg, i) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${msg.sender === 'user' ? 'bg-emerald-500 text-white' : 'bg-purple-600 text-white'}`}>
                                    {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={`px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm shadow-sm ${
                                    msg.sender === 'user' 
                                        ? 'bg-emerald-500 text-white rounded-tr-sm' 
                                        : msg.error 
                                            ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 rounded-tl-sm' 
                                            : isDark ? 'bg-white/[0.06] text-gray-200 border border-white/[0.04] rounded-tl-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex gap-3 max-w-[80%]">
                                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <Bot size={16} />
                                </div>
                                <div className={`px-4 py-3 rounded-2xl border border-transparent flex items-center gap-2 ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                                    <Loader2 size={16} className="animate-spin text-purple-500" />
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Agent is analyzing...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className={`p-4 border-t flex-shrink-0 ${isDark ? 'border-white/[0.06] bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask about your clients, invoices, or prompt for reports..."
                            className={`w-full pl-4 pr-12 py-4 rounded-xl border outline-none font-medium transition-all ${isDark ? 'bg-gray-950 border-white/[0.1] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500' : 'bg-white border-gray-200 text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-sm'}`}
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={!query.trim() || isLoading}
                            className={`absolute right-2 p-2.5 rounded-lg flex items-center justify-center transition-all ${!query.trim() || isLoading ? 'text-gray-400 bg-transparent' : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105 shadow-md shadow-purple-500/20'}`}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                    <p className="text-center text-[10px] mt-2 text-gray-400 dark:text-gray-500 font-medium">AI generated responses can be inaccurate. Verify important information.</p>
                </div>
            </div>
        </div>
    );
}
