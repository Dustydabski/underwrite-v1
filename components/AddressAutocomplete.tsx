"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";

interface Suggestion {
  mapbox_id: string;
  name: string;
  full_address: string | null;
  place_formatted: string | null;
}

/**
 * Address input with a Mapbox Search Box typeahead dropdown. Degrades to a
 * plain text input with no dropdown if NEXT_PUBLIC_MAPBOX_TOKEN isn't set —
 * the parent form still works, just without suggestions.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  inputClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (address: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const sessionToken = useRef<string>(newSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(v: string) {
    onChange(v);
    setHighlighted(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!token || v.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 200);
  }

  async function fetchSuggestions(q: string) {
    try {
      const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
        q
      )}&access_token=${token}&session_token=${sessionToken.current}&types=address&limit=6&country=us`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const results: Suggestion[] = data.suggestions ?? [];
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch {
      // Network hiccup — user can still type/submit the address manually.
    }
  }

  function selectSuggestion(s: Suggestion) {
    const address = s.full_address ?? s.name;
    onChange(address);
    onSelect?.(address);
    setSuggestions([]);
    setOpen(false);
    // A completed suggest→pick is one billable Mapbox session; start a fresh one.
    sessionToken.current = newSessionToken();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-line rounded-md shadow-lg max-h-72 overflow-auto text-sm text-left">
          {suggestions.map((s, i) => (
            <li
              key={s.mapbox_id}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={`px-4 py-2 cursor-pointer ${i === highlighted ? "bg-moss-50" : ""}`}
            >
              {s.full_address ?? s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function newSessionToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
