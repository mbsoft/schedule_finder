'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, MapPin } from 'lucide-react';

interface PostcodeSuggestion {
  postcode: string;
  title: string;
  label: string;
  city: string;
  county: string;
  lat: number | null;
  lng: number | null;
}

interface PostcodeAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: PostcodeSuggestion) => void;
  placeholder?: string;
  'data-testid'?: string;
}

export function PostcodeAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Enter UK postcode (e.g., B15 2TT)',
  ...props
}: PostcodeAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PostcodeSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/postcode-autocomplete?q=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data: PostcodeSuggestion[] = await res.json();
        setSuggestions(data);
        setIsOpen(data.length > 0);
        setActiveIndex(-1);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const handleSelect = (suggestion: PostcodeSuggestion) => {
    const postcode = suggestion.postcode || suggestion.title;
    onChange(postcode);
    setSuggestions([]);
    setIsOpen(false);
    onSelect?.(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="postcode-autocomplete-wrapper">
      <div className="relative">
        <input
          type="text"
          className="form-input"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          data-testid={props['data-testid']}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 size={16} className="animate-spin text-[#a1a1aa]" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="postcode-autocomplete-dropdown absolute left-0 mt-1 w-full rounded border border-[#27272a] bg-[#09090b] shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((s, idx) => {
            const city = s.city || '';
            const county = s.county || '';
            const location = [city, county].filter(Boolean).join(', ');
            const displayPostcode = s.postcode || s.title;
            return (
              <li
                key={`${s.title}-${idx}`}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer text-sm border-b border-[#1a1a1e] last:border-0 transition-colors ${
                  idx === activeIndex
                    ? 'bg-[#27272a]'
                    : 'hover:bg-[#1a1a1e]'
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={() => handleSelect(s)}
              >
                <MapPin size={14} className="text-[#d4f64d] shrink-0" />
                <span className="font-mono font-bold text-[#fafafa] shrink-0">
                  {displayPostcode}
                </span>
                {location && (
                  <span className="text-[#a1a1aa] truncate">
                    {location}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
