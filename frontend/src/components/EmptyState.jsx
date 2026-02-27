import React from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    secondaryActionLabel,
    secondaryActionLink
}) {
    return (
        <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700/50 animate-in fade-in zoom-in duration-500">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-lg mb-6 ring-4 ring-gray-50 dark:ring-gray-700/50">
                <Icon size={48} className="text-gray-400 dark:text-gray-500" />
            </div>

            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
            </h3>

            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
                {description}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                {actionLabel && onAction && (
                    <button
                        onClick={onAction}
                        className="btn-premium px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white rounded-xl font-semibold shadow-lg shadow-green-500/20 flex items-center gap-2 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        {actionLabel}
                    </button>
                )}

                {secondaryActionLabel && secondaryActionLink && (
                    <Link
                        to={secondaryActionLink}
                        className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium flex items-center gap-2 transition-colors group"
                    >
                        <BookOpen size={18} />
                        {secondaryActionLabel}
                    </Link>
                )}
            </div>
        </div>
    );
}
