import React, { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type FilterPanelProps = {
  onFilterChange: (filters: PropertyFilters) => void;
  className?: string;
};

export type PropertyFilters = {
  search: string;
  propertyType: string;
  minPrice: number;
  maxPrice: number;
  bedrooms: number;
  bathrooms: number;
  minArea: number;
  maxArea: number;
  features: string[];
};

const availableFeaturesKeys = [
  'feature.parking',
  'feature.pool',
  'feature.garden',
  'feature.security',
  'feature.gym',
  'feature.balcony',
  'feature.terrace',
  'feature.aircon',
  'feature.fireplace',
  'feature.seaView',
] as const;

export function FilterPanel({ onFilterChange, className = '' }: FilterPanelProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<PropertyFilters>({
    search: '',
    propertyType: '',
    minPrice: 0,
    maxPrice: 0,
    bedrooms: 0,
    bathrooms: 0,
    minArea: 0,
    maxArea: 0,
    features: [],
  });

  const propertyTypes = [
    { value: '', label: t('propertyType.all') },
    { value: 'apartment', label: t('propertyType.apartment') },
    { value: 'house', label: t('propertyType.house') },
    { value: 'villa', label: t('propertyType.villa') },
    { value: 'commercial', label: t('propertyType.commercial') },
    { value: 'land', label: t('propertyType.land') },
  ];

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleFeatureToggle = (feature: string) => {
    const newFeatures = filters.features.includes(feature)
      ? filters.features.filter(f => f !== feature)
      : [...filters.features, feature];
    handleFilterChange('features', newFeatures);
  };

  const clearFilters = () => {
    const clearedFilters: PropertyFilters = {
      search: '',
      propertyType: '',
      minPrice: 0,
      maxPrice: 0,
      bedrooms: 0,
      bathrooms: 0,
      minArea: 0,
      maxArea: 0,
      features: [],
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Поиск */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={t('filter.search')}
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Кнопка расширения фильтров */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{t('filter.additionalFilters')}</span>
        </button>
        
        {(filters.propertyType || filters.minPrice > 0 || filters.maxPrice > 0 || 
          filters.bedrooms > 0 || filters.bathrooms > 0 || filters.minArea > 0 || 
          filters.maxArea > 0 || filters.features.length > 0) && (
          <button
            onClick={clearFilters}
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>{t('filter.clear')}</span>
          </button>
        )}
      </div>

      {/* Расширенные фильтры */}
      {isExpanded && (
        <div className="space-y-6 border-t pt-6">
          {/* Тип недвижимости */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('filter.propertyType')}
            </label>
            <select
              value={filters.propertyType}
              onChange={(e) => handleFilterChange('propertyType', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {propertyTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Цена */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('filter.price')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder={t('filter.from')}
                value={filters.minPrice || ''}
                onChange={(e) => handleFilterChange('minPrice', Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="number"
                placeholder={t('filter.to')}
                value={filters.maxPrice || ''}
                onChange={(e) => handleFilterChange('maxPrice', Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Комнаты */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('filter.bedrooms')}
              </label>
              <select
                value={filters.bedrooms}
                onChange={(e) => handleFilterChange('bedrooms', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0}>{t('filter.anyAmount')}</option>
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}+</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('filter.bathrooms')}
              </label>
              <select
                value={filters.bathrooms}
                onChange={(e) => handleFilterChange('bathrooms', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0}>{t('filter.anyAmount')}</option>
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}+</option>
                ))}
              </select>
            </div>
          </div>

          {/* Площадь */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('filter.area')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder={t('filter.from')}
                value={filters.minArea || ''}
                onChange={(e) => handleFilterChange('minArea', Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="number"
                placeholder={t('filter.to')}
                value={filters.maxArea || ''}
                onChange={(e) => handleFilterChange('maxArea', Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Особенности */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('filter.features')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableFeaturesKeys.map((key) => {
                const feature = t(key);
                return (
                <label key={feature} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.features.includes(feature)}
                    onChange={() => handleFeatureToggle(feature)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{feature}</span>
                </label>
              );})}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}