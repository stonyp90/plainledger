/**
 * Industry KPI Section Component
 * Interactive showcase of industry-specific KPIs with formulas and benchmarks
 * Demonstrates ROI and value for executive decision-makers
 */

import { useState } from 'react';
import { 
  Building2, 
  UtensilsCrossed, 
  Hotel, 
  ShoppingBag, 
  Hammer, 
  Briefcase,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface KPIDefinition {
  name: string;
  nameFr: string;
  formula: string;
  target: string;
}

interface IndustryData {
  id: string;
  name: { en: string; fr: string };
  icon: React.ComponentType<{ className?: string }>;
  kpis: KPIDefinition[];
  profitNote?: { en: string; fr: string };
  benchmarkNote?: { en: string; fr: string };
}

const INDUSTRY_KPIS: IndustryData[] = [
  {
    id: 'restaurant',
    name: { en: 'Restaurant / Food Service', fr: 'Restauration' },
    icon: UtensilsCrossed,
    kpis: [
      { name: 'Food Cost %', nameFr: 'Coût nourriture %', formula: 'Food COGS / Food Sales', target: '25-35%' },
      { name: 'Labor Cost %', nameFr: 'Coût main-d\'oeuvre %', formula: 'Labor / Total Revenue', target: '20-30%' },
      { name: 'Prime Cost %', nameFr: 'Coût principal %', formula: '(Food + Labor) / Revenue', target: '55-65%' },
      { name: 'Beverage Cost %', nameFr: 'Coût boissons %', formula: 'Bev COGS / Bev Sales', target: '18-24%' },
      { name: 'Average Check', nameFr: 'Addition moyenne', formula: 'Revenue / Covers', target: 'Varies' },
    ],
    profitNote: { 
      en: 'Profit margins: QSR 6-9%, Full-service 3-9%, Fine dining 5-10%',
      fr: 'Marges: Restauration rapide 6-9%, Service complet 3-9%, Gastronomie 5-10%'
    },
  },
  {
    id: 'hospitality',
    name: { en: 'Hotel / Hospitality', fr: 'Hôtellerie' },
    icon: Hotel,
    kpis: [
      { name: 'Occupancy Rate', nameFr: 'Taux d\'occupation', formula: 'Rooms Sold / Available', target: '58-75%' },
      { name: 'ADR', nameFr: 'TJM', formula: 'Room Revenue / Rooms Sold', target: '$80-600' },
      { name: 'RevPAR', nameFr: 'RevPAR', formula: 'ADR × Occupancy', target: '$44-450' },
      { name: 'TRevPAR', nameFr: 'TRevPAR', formula: 'Total Rev / Available Rooms', target: 'Varies' },
      { name: 'CPOR', nameFr: 'CPOR', formula: 'Operating Cost / Occupied', target: 'Varies' },
    ],
    benchmarkNote: { 
      en: 'Occupancy targets: Luxury 70-75%, Midscale 58-64%, Economy 52-58%',
      fr: 'Cibles occupation: Luxe 70-75%, Milieu de gamme 58-64%, Économique 52-58%'
    },
  },
  {
    id: 'retail',
    name: { en: 'Retail', fr: 'Commerce de détail' },
    icon: ShoppingBag,
    kpis: [
      { name: 'Inventory Turnover', nameFr: 'Rotation des stocks', formula: 'COGS / Avg Inventory', target: '4-12x/year' },
      { name: 'GMROI', nameFr: 'GMROI', formula: 'Gross Profit / Avg Inventory', target: '>2.0' },
      { name: 'Gross Margin %', nameFr: 'Marge brute %', formula: 'Gross Profit / Sales', target: '25-55%' },
      { name: 'Sales per Sq Ft', nameFr: 'Ventes par pi²', formula: 'Sales / Retail Space', target: 'Varies' },
      { name: 'Shrinkage %', nameFr: 'Démarque %', formula: 'Loss / Sales', target: '<2%' },
    ],
  },
  {
    id: 'real_estate',
    name: { en: 'Real Estate / Immobilier', fr: 'Immobilier' },
    icon: Building2,
    kpis: [
      { name: 'Occupancy Rate', nameFr: 'Taux d\'occupation', formula: 'Occupied Units / Total Units', target: '85-95%' },
      { name: 'Cap Rate', nameFr: 'Taux de capitalisation', formula: 'NOI / Property Value', target: '4-8%' },
      { name: 'NOI', nameFr: 'Résultat net d\'exploitation', formula: 'Revenue - Operating Expenses', target: 'Positive' },
      { name: 'Rent per Sq Ft', nameFr: 'Loyer par pi²', formula: 'Rental Income / Total Sq Ft', target: 'Market-based' },
      { name: 'Cash-on-Cash', nameFr: 'Rendement cash', formula: 'Annual Cash Flow / Cash Invested', target: '8-12%' },
    ],
    benchmarkNote: { 
      en: 'Property types: Multi-family 92-96%, Commercial 85-90%, Retail 88-93%',
      fr: 'Types: Multi-logements 92-96%, Commercial 85-90%, Commerce 88-93%'
    },
  },
  {
    id: 'construction',
    name: { en: 'Construction', fr: 'Construction' },
    icon: Hammer,
    kpis: [
      { name: 'Gross Margin %', nameFr: 'Marge brute %', formula: '(Revenue - Direct Costs) / Revenue', target: '15-30%' },
      { name: 'Backlog Months', nameFr: 'Carnet (mois)', formula: 'Backlog Value / Avg Monthly Revenue', target: '3-12 months' },
      { name: 'WIP Turnover', nameFr: 'Rotation TEC', formula: 'Revenue / Avg WIP Balance', target: '4-8x/year' },
      { name: 'Bid-to-Win Ratio', nameFr: 'Ratio soumissions', formula: 'Won Bids / Total Bids', target: '15-25%' },
      { name: 'Job Margin Variance', nameFr: 'Écart marge projet', formula: 'Actual Margin - Estimated', target: '<5%' },
    ],
  },
  {
    id: 'professional_services',
    name: { en: 'Professional Services', fr: 'Services professionnels' },
    icon: Briefcase,
    kpis: [
      { name: 'Utilization Rate', nameFr: 'Taux d\'utilisation', formula: 'Billable Hours / Available Hours', target: '70-85%' },
      { name: 'Realization Rate', nameFr: 'Taux de réalisation', formula: 'Collected / Billed', target: '85-95%' },
      { name: 'Effective Rate', nameFr: 'Taux effectif', formula: 'Collected Revenue / Billable Hours', target: 'Varies' },
      { name: 'WIP Days', nameFr: 'Jours TEC', formula: 'WIP Balance / (Annual Rev / 365)', target: '30-60 days' },
      { name: 'AR Days', nameFr: 'Jours CC', formula: 'AR Balance / (Annual Rev / 365)', target: '30-45 days' },
    ],
  },
];

interface IndustryKPISectionProps {
  onScheduleCall?: () => void;
}

export default function IndustryKPISection({ onScheduleCall }: IndustryKPISectionProps) {
  const { isEn } = useI18n();
  const [selectedIndustry, setSelectedIndustry] = useState<string>('restaurant');
  
  const currentIndustry = INDUSTRY_KPIS.find(ind => ind.id === selectedIndustry) || INDUSTRY_KPIS[0];
  const Icon = currentIndustry.icon;
  
  return (
    <section 
      id="industry-kpis" 
      className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'rgb(var(--color-bg))' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
              {isEn ? 'Industry-Specific AI' : 'IA spécifique à l\'industrie'}
            </span>
          </div>
          
          <h2 
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn 
              ? 'KPIs Tailored to Your Industry' 
              : 'KPIs adaptés à votre industrie'}
          </h2>
          
          <p 
            className="text-lg max-w-2xl mx-auto"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Our AI understands the specific metrics that matter for your business. See the formulas and benchmarks we track.'
              : 'Notre IA comprend les métriques spécifiques à votre entreprise. Voyez les formules et références que nous suivons.'}
          </p>
        </div>
        
        {/* Industry Selector Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {INDUSTRY_KPIS.map((industry) => {
            const TabIcon = industry.icon;
            const isSelected = selectedIndustry === industry.id;
            
            return (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${isSelected ? 'shadow-md' : 'hover:shadow-sm'}
                `}
                style={{
                  backgroundColor: isSelected 
                    ? 'rgb(var(--color-primary-500))' 
                    : 'rgb(var(--color-surface))',
                  color: isSelected 
                    ? 'white' 
                    : 'rgb(var(--color-text-secondary))',
                  border: `1px solid ${isSelected 
                    ? 'rgb(var(--color-primary-500))' 
                    : 'rgb(var(--color-border))'
                  }`,
                }}
              >
                <TabIcon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isEn ? industry.name.en : industry.name.fr}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* KPI Table Card */}
        <div 
          className="rounded-2xl overflow-hidden shadow-lg border"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          {/* Card Header */}
          <div 
            className="px-6 py-4 border-b flex items-center gap-3"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Icon className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? currentIndustry.name.en : currentIndustry.name.fr}
              </h3>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Key Performance Indicators' : 'Indicateurs clés de performance'}
              </p>
            </div>
          </div>
          
          {/* KPI Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    KPI
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isEn ? 'Formula' : 'Formule'}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isEn ? 'Target / Benchmark' : 'Cible / Référence'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
                {currentIndustry.kpis.map((kpi, idx) => (
                  <tr 
                    key={idx}
                    className="transition-colors hover:bg-opacity-50"
                    style={{ 
                      backgroundColor: idx % 2 === 0 
                        ? 'transparent' 
                        : 'rgb(var(--color-bg-subtle))',
                    }}
                  >
                    <td className="px-6 py-4">
                      <span 
                        className="font-medium"
                        style={{ color: 'rgb(var(--color-text))' }}
                      >
                        {isEn ? kpi.name : kpi.nameFr}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code 
                        className="text-sm px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: 'rgb(var(--color-bg-muted))',
                          color: 'rgb(var(--color-primary-600))',
                        }}
                      >
                        {kpi.formula}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium"
                        style={{ 
                          backgroundColor: 'rgb(var(--color-success) / 0.1)',
                          color: 'rgb(var(--color-success))',
                        }}
                      >
                        {kpi.target}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Profit/Benchmark Note */}
          {(currentIndustry.profitNote || currentIndustry.benchmarkNote) && (
            <div 
              className="px-6 py-4 border-t flex items-start gap-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-accent-500) / 0.05)',
                borderColor: 'rgb(var(--color-border))',
              }}
            >
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-accent-600))' }} />
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn 
                  ? (currentIndustry.profitNote?.en || currentIndustry.benchmarkNote?.en)
                  : (currentIndustry.profitNote?.fr || currentIndustry.benchmarkNote?.fr)
                }
              </p>
            </div>
          )}
        </div>
        
        {/* More Industries Note + CTA */}
        <div className="mt-8 text-center">
          <p 
            className="text-sm mb-6"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <Sparkles className="w-4 h-4 inline mr-1" style={{ color: 'rgb(var(--color-primary-500))' }} />
            {isEn 
              ? 'PlainLedger\'s AI is optimized for 15+ Canadian industries including Manufacturing, Technology/SaaS, Agriculture, Transport & Logistics, Healthcare, and more.'
              : 'L\'IA de PlainLedger est optimisée pour plus de 15 industries canadiennes, y compris la fabrication, technologie/SaaS, agriculture, transport et logistique, santé, et plus.'}
          </p>
          
          <button 
            onClick={onScheduleCall}
            className="btn-primary btn-lg group"
          >
            {isEn ? 'Get KPIs for your specific business' : 'Obtenez les KPIs pour votre entreprise'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}

export { INDUSTRY_KPIS };
export type { IndustryData, KPIDefinition };
