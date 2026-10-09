import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, User } from 'lucide-react';
import { WaliKelas } from '../../types';

export interface SearchableGuruSelectProps {
  guruList: WaliKelas[];
  selectedUsername: string;
  onSelectGuru: (username: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

export const SearchableGuruSelect: React.FC<SearchableGuruSelectProps> = ({
  guruList,
  selectedUsername,
  onSelectGuru,
  placeholder = 'Ketik untuk mencari nama guru / NIP...',
  disabled = false,
  required = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Selected teacher object
  const selectedGuru = useMemo(() => {
    return guruList.find((g) => g.username === selectedUsername);
  }, [guruList, selectedUsername]);

  // Filtered teachers list based on search query
  const filteredGuruList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return guruList;
    return guruList.filter((g) => {
      const matchNama = (g.nama || '').toLowerCase().includes(q);
      const matchUser = (g.username || '').toLowerCase().includes(q);
      const matchNip = (g.nip || '').toLowerCase().includes(q);
      const matchMapel = (g.mataPelajaran || '').toLowerCase().includes(q);
      return matchNama || matchUser || matchNip || matchMapel;
    });
  }, [guruList, searchQuery]);

  // Sync display text when dropdown closes or selectedUsername changes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (username: string) => {
    onSelectGuru(username);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredGuruList.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredGuruList.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredGuruList.length) {
        handleSelect(filteredGuruList[highlightedIndex].username);
      } else if (filteredGuruList.length === 1) {
        handleSelect(filteredGuruList[0].username);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectGuru('');
    setSearchQuery('');
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for HTML5 form validation */}
      {required && (
        <input
          type="text"
          value={selectedUsername}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Main Input Field */}
      <div
        className={`relative flex items-center rounded-xl border bg-white dark:bg-slate-800 transition shadow-xs ${
          isOpen
            ? 'ring-2 ring-blue-500 border-blue-500 dark:border-blue-500'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : 'cursor-text'}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }
        }}
      >
        <div className="pl-3 text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          disabled={disabled}
          value={isOpen ? searchQuery : selectedGuru ? selectedGuru.nama : ''}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setHighlightedIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedGuru ? selectedGuru.nama : placeholder}
          className="w-full py-2.5 pl-2.5 pr-16 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 bg-transparent outline-none truncate"
          autoComplete="off"
        />

        {/* Right Action Icons: Clear & Dropdown Chevron */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {selectedUsername && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Hapus pilihan guru"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                setIsOpen(!isOpen);
                if (!isOpen && inputRef.current) {
                  inputRef.current.focus();
                }
              }
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Filtered Dropdown List */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-64 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header count indicator if searching */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {searchQuery ? `Hasil: ${filteredGuruList.length} guru` : `Daftar: ${guruList.length} guru tersedia`}
            </span>
            <span className="italic">Ketik nama untuk menyaring</span>
          </div>

          <ul ref={listRef} className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 py-1">
            {filteredGuruList.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                <User className="w-6 h-6 mx-auto opacity-40 mb-1" />
                <p className="font-semibold">Tidak ditemukan guru dengan nama "{searchQuery}"</p>
                <p className="text-[11px] mt-0.5">Periksa ejaan atau nama akun guru</p>
              </li>
            ) : (
              filteredGuruList.map((g, index) => {
                const isSelected = g.username === selectedUsername;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={g.id || g.username}
                    onClick={() => handleSelect(g.username)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2.5 text-xs flex items-center justify-between gap-2.5 cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 font-bold'
                        : isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-700/70 text-slate-900 dark:text-slate-100'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar Circle */}
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {(g.nama || 'G').charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold truncate text-slate-800 dark:text-slate-100">
                          {g.nama}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-400 flex items-center gap-1.5 truncate">
                          <span>@{g.username}</span>
                          {g.nip && (
                            <>
                              <span>·</span>
                              <span>NIP: {g.nip}</span>
                            </>
                          )}
                          {g.mataPelajaran && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-600 dark:text-emerald-400 truncate">
                                {g.mataPelajaran}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
