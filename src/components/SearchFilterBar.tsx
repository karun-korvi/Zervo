import React from 'react';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { ALL_SERVICE_CATEGORIES } from '../data/zevroData';
import { BusinessSegment, ServiceCategory } from '../types/zevro';

export interface PricePreset {
  id: string;
  label: string;
  min: string;
  max: string;
}

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  selectedCategory: ServiceCategory;
  onCategoryChange: (category: ServiceCategory) => void;
  segmentFilter: 'All' | BusinessSegment;
  onSegmentChange: (segment: 'All' | BusinessSegment) => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  priceLabel: string;
  pricePresets: PricePreset[];
  resultCount: number;
  totalCount: number;
  itemNoun: string;
  onResetAll: () => void;
  accentTone?: 'crimson' | 'emerald';
  extraControls?: React.ReactNode;
}

export const CATEGORIES: ServiceCategory[] = ALL_SERVICE_CATEGORIES;

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  selectedCategory,
  onCategoryChange,
  segmentFilter,
  onSegmentChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  priceLabel,
  pricePresets,
  resultCount,
  totalCount,
  itemNoun,
  onResetAll,
  accentTone = 'crimson',
  extraControls,
}) => {
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    segmentFilter !== 'All' ||
    minPrice !== '' ||
    maxPrice !== '';

  const applyPreset = (preset: PricePreset) => {
    onMinPriceChange(preset.min);
    onMaxPriceChange(preset.max);
  };

  const focusBorder =
    accentTone === 'emerald'
      ? 'focus:border-[#059669]'
      : 'focus:border-[#e23744]';
  const activeText =
    accentTone === 'emerald' ? 'text-[#047857]' : 'text-[#be123c]';
  const iconColor =
    accentTone === 'emerald' ? 'text-[#059669]' : 'text-[#e23744]';

  return (
    <div className="rounded-2xl border border-[#e4e4e7] bg-white p-4 sm:p-5">
      {/* Row 1: Keyword Search + Price Range Inputs + Extra Controls */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
        {/* Keyword Search */}
        <div className="lg:col-span-5">
          <label
            htmlFor="filter-bar-search"
            className="block text-xs font-semibold text-[#52525b]"
          >
            Search {itemNoun}
          </label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a]"
              aria-hidden="true"
            />
            <input
              id="filter-bar-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={`h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] pl-10 pr-9 text-sm text-[#18181b] placeholder:text-[#71717a] ${focusBorder} focus:bg-white focus:outline-none`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear keyword"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Min / Max Price Range */}
        <div className="lg:col-span-4">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[#52525b]">
            <SlidersHorizontal className={`h-3.5 w-3.5 ${iconColor}`} aria-hidden="true" />
            <span>{priceLabel}</span>
          </span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#71717a]">
                ₹
              </span>
              <input
                type="number"
                min={0}
                step={50}
                aria-label={`Minimum ${priceLabel}`}
                value={minPrice}
                onChange={(e) => onMinPriceChange(e.target.value)}
                placeholder="Min"
                className={`h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] pl-7 pr-2.5 font-mono text-sm text-[#18181b] tabular-nums placeholder:text-[#71717a] ${focusBorder} focus:bg-white focus:outline-none`}
              />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#71717a]">
                ₹
              </span>
              <input
                type="number"
                min={0}
                step={50}
                aria-label={`Maximum ${priceLabel}`}
                value={maxPrice}
                onChange={(e) => onMaxPriceChange(e.target.value)}
                placeholder="Max"
                className={`h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] pl-7 pr-2.5 font-mono text-sm text-[#18181b] tabular-nums placeholder:text-[#71717a] ${focusBorder} focus:bg-white focus:outline-none`}
              />
            </div>
          </div>
        </div>

        {/* Segment Dropdown / Extra Slot */}
        <div className="flex flex-wrap items-center gap-2 lg:col-span-3 lg:justify-end">
          <div className="flex-1 lg:flex-none">
            <label
              htmlFor="filter-bar-segment"
              className="block text-xs font-semibold text-[#52525b]"
            >
              Customer Type
            </label>
            <select
              id="filter-bar-segment"
              value={segmentFilter}
              onChange={(e) =>
                onSegmentChange(e.target.value as 'All' | BusinessSegment)
              }
              className={`mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] ${focusBorder} focus:outline-none cursor-pointer`}
            >
              <option value="All">All (B2B &amp; B2C)</option>
              <option value="B2C">B2C Household</option>
              <option value="B2B">B2B Business</option>
            </select>
          </div>
          {extraControls}
        </div>
      </div>

      {/* Row 2: 15-Category Dropdown & Price Presets + Live Count / Reset */}
      <div className="mt-4 flex flex-col gap-3 border-t border-[#e4e4e7] pt-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Category Selector (15 B2C + B2B Categories) */}
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="filter-bar-category"
            className="text-xs font-semibold text-[#52525b] whitespace-nowrap"
          >
            Category (15):
          </label>
          <select
            id="filter-bar-category"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value as ServiceCategory)}
            className={`h-9 rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 text-xs font-semibold text-[#18181b] ${focusBorder} focus:bg-white focus:outline-none cursor-pointer`}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category === 'All' ? 'All 15 Categories (B2C & B2B)' : category}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Price Range Presets + Count + Reset */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Quick price range presets"
            className="flex flex-wrap items-center gap-1 rounded-xl bg-[#f4f4f5] p-1"
          >
            {pricePresets.map((preset) => {
              const active = minPrice === preset.min && maxPrice === preset.max;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`min-h-[32px] rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                    active
                      ? `bg-white ${activeText} shadow-xs`
                      : 'text-[#52525b] hover:text-[#18181b]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <span className="ml-1 font-mono text-xs font-semibold text-[#71717a] tabular-nums whitespace-nowrap">
            {resultCount} / {totalCount} {itemNoun}
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              className={`inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-1 text-xs font-semibold ${activeText} hover:bg-[#f4f4f5] whitespace-nowrap cursor-pointer`}
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
