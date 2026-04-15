/**
 * SearchableSelect - Mobile-first searchable dropdown with manual typing fallback.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import type { ReactNode } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  id: string;
  label: string;
  labelIcon?: ReactNode;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  required?: boolean;
  autoComplete?: string;
}

export function SearchableSelect({
  id,
  label,
  labelIcon,
  value,
  options,
  onChange,
  placeholder = 'Search or type...',
  disabled = false,
  loading = false,
  loadError = false,
  onRetry,
  required = false,
  autoComplete,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id}-listbox`;

  // Display text: selected option label or manual value.
  const displayText = options.find((option) => option.value === value)?.label || value;

  // Filter options by search query.
  const filtered = search.trim()
    ? options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Close dropdown when clicking outside.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      setSearch('');
      inputRef.current?.blur();
    },
    [onChange],
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearch('');
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
      inputRef.current?.blur();
      return;
    }

    // Allow submitting a custom value on Enter.
    if (event.key === 'Enter' && search.trim()) {
      event.preventDefault();
      if (filtered.length > 0) {
        handleSelect(filtered[0].value);
      } else {
        onChange(search.trim());
        setIsOpen(false);
        setSearch('');
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {labelIcon && <span className="text-[#3A63B8]">{labelIcon}</span>}
          <span>{label}</span>
        </label>
        <div className="flex h-12 w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-400">
          <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {labelIcon && <span className="text-[#3A63B8]">{labelIcon}</span>}
          <span>{label}</span>
        </label>
        <div className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3">
          <span className="text-sm text-red-600">Failed to load</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="text-sm font-semibold text-[#2b8cee] hover:underline">
              Retry
            </button>
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Type ${label.toLowerCase()} manually`}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#2b8cee] focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/20"
        />
      </div>
    );
  }

  return (
    <div className="relative space-y-2" ref={containerRef}>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-900" htmlFor={id}>
        {labelIcon && <span className="text-[#3A63B8]">{labelIcon}</span>}
        <span>{label}</span>
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={isOpen ? search : displayText}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={isOpen ? `Search ${label.toLowerCase()}...` : placeholder}
          disabled={disabled}
          autoComplete={autoComplete || 'off'}
          aria-required={required}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          role="combobox"
          className={`h-12 w-full rounded-xl border bg-white px-4 pr-10 text-base text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#2b8cee] focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/20 ${
            disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400' : 'border-slate-200'
          }`}
        />

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">
              {search.trim() ? (
                <span>
                  No results. Press <strong>Enter</strong> to use "{search.trim()}"
                </span>
              ) : (
                'No options available'
              )}
            </li>
          ) : (
            filtered.slice(0, 50).map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onClick={() => handleSelect(option.value)}
                className={`cursor-pointer px-4 py-3 text-sm transition-colors ${
                  option.value === value
                    ? 'bg-[#2b8cee]/10 font-semibold text-[#2b8cee]'
                    : 'text-slate-900 hover:bg-slate-50 active:bg-slate-100'
                }`}
              >
                {option.label}
              </li>
            ))
          )}

          {filtered.length > 50 && (
            <li className="px-4 py-2 text-center text-xs text-slate-400">
              Type to narrow down {filtered.length - 50}+ more results
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
