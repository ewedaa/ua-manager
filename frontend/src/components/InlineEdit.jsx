import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Loader2, Pencil } from 'lucide-react';

/**
 * InlineEdit - A super-fast inline editing component
 * Click to edit, Enter to save, Escape to cancel
 * 
 * @param {string} value - Current value to display
 * @param {function} onSave - Async function called when saving (receives new value)
 * @param {string} type - Input type: 'text' | 'number' | 'textarea' | 'select'
 * @param {array} options - Options for select type [{value, label}]
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional CSS classes
 * @param {boolean} disabled - Disable editing
 * @param {function} validate - Validation function (return true or error message)
 */
const InlineEdit = ({
    value = '',
    onSave,
    type = 'text',
    options = [],
    placeholder = 'Click to edit...',
    className = '',
    disabled = false,
    validate,
    displayFormatter,
    editFormatter,
    minRows = 2,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Sync with external value changes
    useEffect(() => {
        if (!isEditing) {
            setEditValue(value);
        }
    }, [value, isEditing]);

    // Focus and select on edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (type !== 'select' && inputRef.current.select) {
                inputRef.current.select();
            }
        }
    }, [isEditing, type]);

    // Click outside to cancel
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                handleCancel();
            }
        };

        if (isEditing) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isEditing]);

    const handleEdit = useCallback(() => {
        if (disabled) return;
        setEditValue(editFormatter ? editFormatter(value) : value);
        setIsEditing(true);
        setError(null);
    }, [disabled, value, editFormatter]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
        setEditValue(value);
        setError(null);
    }, [value]);

    const handleSave = useCallback(async () => {
        // Skip if value unchanged
        const originalValue = editFormatter ? editFormatter(value) : value;
        if (editValue === originalValue) {
            setIsEditing(false);
            return;
        }

        // Validate
        if (validate) {
            const validationResult = validate(editValue);
            if (validationResult !== true) {
                setError(validationResult || 'Invalid value');
                return;
            }
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave(editValue);
            setIsEditing(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1500);
        } catch (err) {
            setError(err.message || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    }, [editValue, value, validate, onSave, editFormatter]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && type !== 'textarea') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        } else if (e.key === 'Enter' && type === 'textarea' && e.ctrlKey) {
            e.preventDefault();
            handleSave();
        }
    }, [type, handleSave, handleCancel]);

    // Display value
    const displayValue = displayFormatter ? displayFormatter(value) : value;

    // Render input based on type
    const renderInput = () => {
        const baseInputClass = `
            w-full px-2 py-1 rounded border transition-all duration-150
            focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
        `;

        switch (type) {
            case 'textarea':
                return (
                    <textarea
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`${baseInputClass} resize-none`}
                        rows={minRows}
                        placeholder={placeholder}
                        disabled={isSaving}
                    />
                );

            case 'select':
                return (
                    <select
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={baseInputClass}
                        disabled={isSaving}
                    >
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );

            case 'number':
                return (
                    <input
                        ref={inputRef}
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={baseInputClass}
                        placeholder={placeholder}
                        disabled={isSaving}
                    />
                );

            default:
                return (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={baseInputClass}
                        placeholder={placeholder}
                        disabled={isSaving}
                    />
                );
        }
    };

    // Edit mode
    if (isEditing) {
        return (
            <div ref={containerRef} className={`inline-edit inline-edit--editing ${className}`}>
                <div className="flex items-start gap-1">
                    <div className="flex-1">
                        {renderInput()}
                        {error && (
                            <p className="text-xs text-red-500 mt-1 animate-shake">{error}</p>
                        )}
                    </div>
                    <div className="flex gap-1 mt-0.5">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="p-1 rounded bg-green-500 text-white hover:bg-green-600 
                                     transition-all duration-150 hover:scale-110 active:scale-95
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Save (Enter)"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="p-1 rounded bg-gray-400 text-white hover:bg-gray-500 
                                     transition-all duration-150 hover:scale-110 active:scale-95
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Cancel (Escape)"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    {type === 'textarea' ? 'Ctrl+Enter to save' : 'Enter to save, Escape to cancel'}
                </p>
            </div>
        );
    }

    // Display mode
    return (
        <div
            ref={containerRef}
            className={`inline-edit group relative ${className} ${!disabled ? 'cursor-pointer' : ''}`}
            onClick={handleEdit}
            onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-label={`Edit ${displayValue || placeholder}`}
        >
            <span className={`
                inline-flex items-center gap-1 px-1 py-0.5 rounded transition-all duration-150
                ${!disabled ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                ${showSuccess ? 'bg-green-100 dark:bg-green-900/30' : ''}
            `}>
                <span className={!displayValue ? 'text-gray-400 italic' : ''}>
                    {displayValue || placeholder}
                </span>
                {!disabled && (
                    <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 
                                      transition-opacity duration-150" />
                )}
                {showSuccess && (
                    <Check className="w-3 h-3 text-green-500 animate-bounce-in" />
                )}
            </span>
        </div>
    );
};

/**
 * InlineEditNumber - Specialized for number editing with formatting
 */
export const InlineEditNumber = ({ value, onSave, suffix = '', ...props }) => {
    return (
        <InlineEdit
            value={value}
            onSave={onSave}
            type="number"
            displayFormatter={(v) => `${v}${suffix}`}
            editFormatter={(v) => String(v).replace(suffix, '')}
            {...props}
        />
    );
};

/**
 * InlineEditDate - Specialized for date editing
 */
export const InlineEditDate = ({ value, onSave, ...props }) => {
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    };

    return (
        <InlineEdit
            value={value}
            onSave={onSave}
            type="text"
            displayFormatter={formatDate}
            placeholder="No date set"
            {...props}
        />
    );
};

export default InlineEdit;
