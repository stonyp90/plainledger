/**
 * Driver Library Component
 * 
 * Sidebar with searchable list of available drivers
 * Can be used to add drivers to the financial model
 */

import { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { type Driver } from '../../lib/financialModel';
import { getAllIndustries } from '../../lib/industries';
import { useI18n } from '../../lib/i18n';

interface DriverLibraryProps {
  onAddDriver?: (driverTemplate: any) => void;
  existingDrivers?: Record<string, Driver>;
}

export default function DriverLibrary({ onAddDriver, existingDrivers = {} }: DriverLibraryProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const industries = getAllIndustries();
  
  // Extract all driver templates from industries
  const allDriverTemplates = useMemo(() => {
    const templates: any[] = [];
    industries.forEach(industry => {
      industry.drivers.forEach(driver => {
        templates.push({
          ...driver,
          industryId: industry.id,
          industryName: isEn ? industry.name.en : industry.name.fr,
        });
      });
    });
    return templates;
  }, [industries, isEn]);
  
  // Filter drivers
  const filteredDrivers = useMemo(() => {
    let filtered = allDriverTemplates;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(driver =>
        (isEn ? driver.name.en : driver.name.fr).toLowerCase().includes(query) ||
        driver.group.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(driver => driver.group === selectedCategory);
    }
    
    return filtered;
  }, [allDriverTemplates, searchQuery, selectedCategory, isEn]);
  
  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(allDriverTemplates.map(d => d.group));
    return Array.from(cats);
  }, [allDriverTemplates]);
  
  const handleAddDriver = (template: any) => {
    if (onAddDriver) {
      onAddDriver(template);
    }
  };
  
  return (
    <div 
      className="h-full flex flex-col"
      style={{
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        width: '300px',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: '#E5E7EB' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: '#111827' }}>
          {isEn ? 'Driver Library' : 'Bibliothèque de pilotes'}
        </h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Search drivers...' : 'Rechercher des pilotes...'}
            className="w-full pl-10 pr-3 py-2 text-sm border rounded-lg"
            style={{
              borderColor: '#E5E7EB',
            }}
          />
        </div>
        
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2 py-1 text-xs rounded ${
              selectedCategory === 'all' ? 'font-medium' : ''
            }`}
            style={{
              backgroundColor: selectedCategory === 'all' ? '#3B82F6' : '#F3F4F6',
              color: selectedCategory === 'all' ? '#FFFFFF' : '#374151',
            }}
          >
            {isEn ? 'All' : 'Tous'}
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 text-xs rounded ${
                selectedCategory === cat ? 'font-medium' : ''
              }`}
              style={{
                backgroundColor: selectedCategory === cat ? '#3B82F6' : '#F3F4F6',
                color: selectedCategory === cat ? '#FFFFFF' : '#374151',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      {/* Driver List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredDrivers.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: '#6B7280' }}>
            {isEn ? 'No drivers found' : 'Aucun pilote trouvé'}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredDrivers.map((template, idx) => {
              const exists = Object.values(existingDrivers).some(
                d => (isEn ? d.nameEn || d.name : d.name) === (isEn ? template.name.en : template.name.fr)
              );
              
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: exists ? '#F3F4F6' : '#FFFFFF',
                    borderColor: '#E5E7EB',
                    opacity: exists ? 0.6 : 1,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm" style={{ color: '#111827' }}>
                          {isEn ? template.name.en : template.name.fr}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded" style={{
                          backgroundColor: '#DBEAFE',
                          color: '#1E40AF',
                        }}>
                          {template.group}
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
                          {isEn ? template.description.en : template.description.fr}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                        <span>{template.format}</span>
                        {template.dataSource === 'formula' && (
                          <span className="px-1.5 py-0.5 rounded" style={{
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                          }}>
                            Formula
                          </span>
                        )}
                      </div>
                    </div>
                    {!exists && onAddDriver && (
                      <button
                        onClick={() => handleAddDriver(template)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        title={isEn ? 'Add driver' : 'Ajouter le pilote'}
                      >
                        <Plus className="w-4 h-4" style={{ color: '#3B82F6' }} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
