import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  searchPlaceholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  disabled = false,
  required = false,
  searchPlaceholder = 'Cari unit / nama...',
  className = '',
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => {
    const q = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = (val: string, optDisabled?: boolean) => {
    if (optDisabled) return;
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-[#FAF7F2] border text-left rounded-xl transition-all shadow-2xs ${
          isOpen
            ? 'border-[#7B1113] ring-2 ring-[#7B1113]/20'
            : 'border-[#E2D7C5] hover:border-[#7B1113]'
        } ${disabled ? 'bg-[#EDE4D5] text-stone-400 cursor-not-allowed' : 'cursor-pointer text-[#181A1F]'}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-stone-500 shrink-0">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-[#181A1F]">{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="text-xs text-stone-600 truncate">({selectedOption.subLabel})</span>
              )}
              {selectedOption.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EDE4D5] text-[#181A1F] border border-[#D6C7B2]">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-stone-400 font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 ml-2 shrink-0">
          {value && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 hover:bg-[#EDE4D5] rounded text-stone-400 hover:text-[#7B1113] transition-colors"
              title="Hapus pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#7B1113]' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#FAF7F2] border border-[#E2D7C5] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-[#E2D7C5] bg-[#F2EBDE] sticky top-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-[#181A1F] focus:outline-none focus:border-[#7B1113] focus:ring-1 focus:ring-[#7B1113]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-[#EFE7DA] p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-stone-500">
                Tidak ada data yang cocok dengan "{search}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value, opt.disabled)}
                    className={`px-3 py-2 text-xs flex items-center justify-between rounded-lg cursor-pointer transition-colors ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed bg-[#EDE4D5]/40'
                        : isSelected
                        ? 'bg-[#7B1113] text-[#FAF7F2] font-bold'
                        : 'hover:bg-[#EFE7DA] text-[#181A1F]'
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className={isSelected ? 'text-[#FAF7F2]' : 'text-[#181A1F]'}>
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              isSelected
                                ? 'bg-[#580A0B] text-amber-300'
                                : 'bg-[#EDE4D5] text-stone-700'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subLabel && (
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-amber-200' : 'text-stone-500'
                          }`}
                        >
                          {opt.subLabel}
                        </div>
                      )}
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-amber-300 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
