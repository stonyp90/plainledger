/**
 * Industry KPI Section Component - Runway-Style Dashboard
 * Interactive showcase with animated charts and clear ROI for executives
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  UtensilsCrossed, 
  Hotel, 
  ShoppingBag, 
  Hammer, 
  Briefcase,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  AlertCircle,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';

// Theme colors - Corporate green palette (consistent with Landing page)
const colors = {
  green: '#059669',      // emerald-600 - primary corporate green
  greenDark: '#047857',  // emerald-700 - darker for depth
  greenLight: '#10b981', // emerald-500 - lighter accents
  gold: '#d4af37',       // classic gold
  goldDark: '#b8860b',   // darker gold
};

// =====================================================
// ANIMATED HOOKS & COMPONENTS
// =====================================================

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [threshold]);
  
  return { ref, isInView };
}

// Mini sparkline chart component with industry benchmark comparison
function AnimatedSparkline({ 
  data, 
  benchmarkData,
  color, 
  benchmarkColor = 'rgba(148, 163, 184, 0.6)',
  height = 32,
  showFill = true,
  isVisible = true 
}: { 
  data: number[]; 
  benchmarkData?: number[];
  color: string; 
  benchmarkColor?: string;
  height?: number;
  showFill?: boolean;
  isVisible?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!isVisible) return;
    let start: number;
    let animationId: number;
    const animate = (time: number) => {
      if (!start) start = time;
      const p = Math.min((time - start) / 1200, 1);
      setProgress(p);
      if (p < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isVisible]);
  
  // Calculate min/max across both datasets for consistent scale
  const allData = benchmarkData ? [...data, ...benchmarkData] : data;
  const max = Math.max(...allData);
  const min = Math.min(...allData);
  const range = max - min || 1;
  
  const getPoints = (values: number[]) => values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  
  const points = getPoints(data);
  const benchmarkPoints = benchmarkData ? getPoints(benchmarkData) : [];
  
  const visiblePoints = points.slice(0, Math.ceil(data.length * progress));
  const visibleBenchmarkPoints = benchmarkPoints.slice(0, Math.ceil(benchmarkPoints.length * progress));
  
  return (
    <svg width="100%" height={height} className="overflow-visible">
      {/* Industry benchmark line (dashed, behind) */}
      {benchmarkData && visibleBenchmarkPoints.length > 1 && (
        <polyline
          points={visibleBenchmarkPoints.join(' ')}
          fill="none"
          stroke={benchmarkColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
        />
      )}
      {/* User data fill */}
      {showFill && visiblePoints.length > 1 && (
        <polygon
          points={`0,${height} ${visiblePoints.join(' ')} ${visiblePoints.length > 0 ? visiblePoints[visiblePoints.length - 1].split(',')[0] : 0},${height}`}
          fill={`${color}15`}
        />
      )}
      {/* User data line */}
      <polyline
        points={visiblePoints.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* User data end point */}
      {visiblePoints.length > 0 && progress > 0.8 && (
        <circle
          cx={visiblePoints[visiblePoints.length - 1]?.split(',')[0]}
          cy={visiblePoints[visiblePoints.length - 1]?.split(',')[1]}
          r="3"
          fill={color}
        />
      )}
      {/* Benchmark end point */}
      {benchmarkData && visibleBenchmarkPoints.length > 0 && progress > 0.8 && (
        <circle
          cx={visibleBenchmarkPoints[visibleBenchmarkPoints.length - 1]?.split(',')[0]}
          cy={visibleBenchmarkPoints[visibleBenchmarkPoints.length - 1]?.split(',')[1]}
          r="2"
          fill={benchmarkColor}
          opacity={0.7}
        />
      )}
    </svg>
  );
}

// =====================================================
// INDUSTRY DATA
// =====================================================

interface KPIDefinition {
  name: string;
  nameFr: string;
  formula: string;
  target: string;
  currentValue: number;
  targetValue: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  impact: string;
  impactFr: string;
  chartData: number[];
  industryBenchmark: number[]; // Industry average trend for comparison
}

interface IndustryData {
  id: string;
  name: { en: string; fr: string };
  icon: React.ComponentType<{ className?: string }>;
  kpis: KPIDefinition[];
  profitNote?: { en: string; fr: string };
  benchmarkNote?: { en: string; fr: string };
  roiHighlight: { en: string; fr: string };
  roiValue: string;
}

const INDUSTRY_KPIS: IndustryData[] = [
  // Real Estate FIRST as primary focus
  {
    id: 'real_estate',
    name: { en: 'Real Estate', fr: 'Immobilier' },
    icon: Building2,
    roiHighlight: { en: 'Vacancy cost reduction', fr: 'Réduction coûts vacance' },
    roiValue: '-40%',
    kpis: [
      { 
        name: 'Occupancy Rate', 
        nameFr: 'Taux d\'occupation', 
        formula: 'Occupied Units / Total Units', 
        target: '85-95%',
        currentValue: 94,
        targetValue: 92,
        trend: 'up',
        trendValue: '+2%',
        impact: 'Near full occupancy',
        impactFr: 'Quasi pleine occupation',
        chartData: [88, 89, 90, 91, 92, 93, 94],
        industryBenchmark: [85, 85, 86, 86, 87, 87, 88],
      },
      { 
        name: 'Cap Rate', 
        nameFr: 'Taux de capitalisation', 
        formula: 'NOI / Property Value', 
        target: '4-8%',
        currentValue: 6.2,
        targetValue: 6.0,
        trend: 'stable',
        trendValue: '0%',
        impact: 'Healthy returns',
        impactFr: 'Rendements sains',
        chartData: [5.8, 5.9, 6.0, 6.1, 6.1, 6.2, 6.2],
        industryBenchmark: [5.5, 5.5, 5.6, 5.6, 5.7, 5.7, 5.8],
      },
      { 
        name: 'NOI', 
        nameFr: 'Résultat net d\'exploitation', 
        formula: 'Revenue - Operating Expenses', 
        target: 'Positive',
        currentValue: 185000,
        targetValue: 170000,
        trend: 'up',
        trendValue: '+8%',
        impact: '+$15K vs target',
        impactFr: '+15K$ vs cible',
        chartData: [160, 165, 170, 175, 178, 182, 185],
        industryBenchmark: [150, 152, 155, 158, 160, 162, 165],
      },
      { 
        name: 'Cash-on-Cash', 
        nameFr: 'Rendement cash-on-cash', 
        formula: 'Annual Cash Flow / Cash Invested', 
        target: '8-12%',
        currentValue: 10.5,
        targetValue: 10,
        trend: 'up',
        trendValue: '+0.5%',
        impact: 'Strong cash returns',
        impactFr: 'Forts rendements cash',
        chartData: [8.5, 9, 9.5, 9.8, 10, 10.2, 10.5],
        industryBenchmark: [7.5, 7.6, 7.8, 8.0, 8.1, 8.2, 8.3],
      },
    ],
    benchmarkNote: { 
      en: 'Property types: Multi-family 92-96%, Commercial 85-90%, Retail 88-93%',
      fr: 'Types de propriétés: Multi-logements 92-96%, Commercial 85-90%, Commerce 88-93%'
    },
  },
  {
    id: 'restaurant',
    name: { en: 'Restaurant', fr: 'Restauration' },
    icon: UtensilsCrossed,
    roiHighlight: { en: 'Avg savings from waste reduction', fr: 'Économies moyennes réduction gaspillage' },
    roiValue: '$4,200/mo',
    kpis: [
      { 
        name: 'Food Cost %', 
        nameFr: 'Coût nourriture %', 
        formula: 'Food COGS / Food Sales', 
        target: '25-35%',
        currentValue: 28.5,
        targetValue: 30,
        trend: 'down',
        trendValue: '-2.1%',
        impact: 'On target, $1,200/mo saved',
        impactFr: 'Dans la cible, 1 200$/mois économisés',
        chartData: [32, 31, 30, 29.5, 29, 28.8, 28.5],
        industryBenchmark: [33, 32.5, 32, 31.5, 31, 31, 30.5],
      },
      { 
        name: 'Labor Cost %', 
        nameFr: 'Coût main-d\'œuvre %', 
        formula: 'Labor / Total Revenue', 
        target: '20-30%',
        currentValue: 24.2,
        targetValue: 25,
        trend: 'stable',
        trendValue: '0%',
        impact: 'Optimized scheduling',
        impactFr: 'Horaires optimisés',
        chartData: [25, 24.5, 24.8, 24.2, 24.3, 24.1, 24.2],
        industryBenchmark: [27, 26.8, 26.5, 26.2, 26, 25.8, 25.5],
      },
      { 
        name: 'Prime Cost %', 
        nameFr: 'Coût principal %', 
        formula: '(Food + Labor) / Revenue', 
        target: '55-65%',
        currentValue: 52.7,
        targetValue: 60,
        trend: 'down',
        trendValue: '-3.2%',
        impact: 'Above industry avg',
        impactFr: 'Au-dessus de la moyenne',
        chartData: [58, 57, 56, 55, 54, 53, 52.7],
        industryBenchmark: [62, 61, 60, 59.5, 59, 58.5, 58],
      },
      { 
        name: 'Revenue', 
        nameFr: 'Revenus', 
        formula: 'Total Sales', 
        target: 'Growth',
        currentValue: 847000,
        targetValue: 800000,
        trend: 'up',
        trendValue: '+12%',
        impact: '+$47K vs target',
        impactFr: '+47K$ vs cible',
        chartData: [720, 745, 780, 800, 815, 830, 847],
        industryBenchmark: [700, 710, 720, 730, 740, 750, 760],
      },
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
    roiHighlight: { en: 'Revenue increase from dynamic pricing', fr: 'Augmentation revenus tarification dynamique' },
    roiValue: '+18%',
    kpis: [
      { 
        name: 'Occupancy Rate', 
        nameFr: 'Taux d\'occupation', 
        formula: 'Rooms Sold / Available', 
        target: '58-75%',
        currentValue: 72,
        targetValue: 70,
        trend: 'up',
        trendValue: '+5%',
        impact: '+$8,400/mo revenue',
        impactFr: '+8 400$/mois revenus',
        chartData: [65, 67, 68, 70, 71, 71.5, 72],
        industryBenchmark: [60, 61, 62, 63, 64, 65, 66],
      },
      { 
        name: 'ADR', 
        nameFr: 'TJM (Tarif journalier moyen)', 
        formula: 'Room Revenue / Rooms Sold', 
        target: '$80-600',
        currentValue: 185,
        targetValue: 175,
        trend: 'up',
        trendValue: '+6%',
        impact: 'Dynamic pricing working',
        impactFr: 'Tarification dynamique efficace',
        chartData: [165, 170, 172, 178, 180, 183, 185],
        industryBenchmark: [155, 157, 159, 161, 163, 165, 167],
      },
      { 
        name: 'RevPAR', 
        nameFr: 'RevPAR (Revenu par chambre)', 
        formula: 'ADR × Occupancy', 
        target: '$44-450',
        currentValue: 133.2,
        targetValue: 122.5,
        trend: 'up',
        trendValue: '+9%',
        impact: 'Exceeding benchmark',
        impactFr: 'Au-dessus de la référence',
        chartData: [107, 114, 117, 125, 128, 131, 133.2],
        industryBenchmark: [93, 96, 99, 102, 105, 107, 110],
      },
      { 
        name: 'GOP Margin', 
        nameFr: 'Marge GOP (Bénéfice brut)', 
        formula: 'GOP / Total Revenue', 
        target: '35-45%',
        currentValue: 38.5,
        targetValue: 38,
        trend: 'up',
        trendValue: '+1.2%',
        impact: 'Strong profitability',
        impactFr: 'Forte rentabilité',
        chartData: [35, 36, 36.5, 37, 37.5, 38, 38.5],
        industryBenchmark: [32, 32.5, 33, 33.5, 34, 34.5, 35],
      },
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
    roiHighlight: { en: 'Inventory optimization savings', fr: 'Économies optimisation inventaire' },
    roiValue: '$12K/yr',
    kpis: [
      { 
        name: 'Inventory Turnover', 
        nameFr: 'Rotation des stocks', 
        formula: 'COGS / Avg Inventory', 
        target: '4-12x/year',
        currentValue: 8.2,
        targetValue: 8,
        trend: 'up',
        trendValue: '+0.5x',
        impact: 'Reduced carrying costs',
        impactFr: 'Coûts de stockage réduits',
        chartData: [6.5, 7, 7.3, 7.6, 7.8, 8, 8.2],
        industryBenchmark: [5.5, 5.7, 5.9, 6.1, 6.3, 6.5, 6.7],
      },
      { 
        name: 'GMROI', 
        nameFr: 'GMROI (Retour sur investissement)', 
        formula: 'Gross Profit / Avg Inventory', 
        target: '>2.0',
        currentValue: 2.4,
        targetValue: 2.0,
        trend: 'up',
        trendValue: '+12%',
        impact: 'Strong ROI on inventory',
        impactFr: 'Fort ROI sur inventaire',
        chartData: [1.9, 2.0, 2.1, 2.2, 2.3, 2.35, 2.4],
        industryBenchmark: [1.7, 1.75, 1.8, 1.85, 1.9, 1.95, 2.0],
      },
      { 
        name: 'Gross Margin %', 
        nameFr: 'Marge brute %', 
        formula: 'Gross Profit / Sales', 
        target: '25-55%',
        currentValue: 42,
        targetValue: 40,
        trend: 'up',
        trendValue: '+2%',
        impact: 'Better pricing strategy',
        impactFr: 'Meilleure stratégie de prix',
        chartData: [38, 39, 39.5, 40, 41, 41.5, 42],
        industryBenchmark: [35, 35.5, 36, 36.5, 37, 37.5, 38],
      },
      { 
        name: 'Shrinkage %', 
        nameFr: 'Démarque inconnue %', 
        formula: 'Loss / Sales', 
        target: '<2%',
        currentValue: 1.2,
        targetValue: 2.0,
        trend: 'down',
        trendValue: '-0.4%',
        impact: 'Loss prevention working',
        impactFr: 'Prévention des pertes efficace',
        chartData: [1.8, 1.7, 1.5, 1.4, 1.35, 1.25, 1.2],
        industryBenchmark: [2.2, 2.1, 2.0, 1.95, 1.9, 1.85, 1.8],
      },
    ],
  },
  {
    id: 'construction',
    name: { en: 'Construction', fr: 'Construction' },
    icon: Hammer,
    roiHighlight: { en: 'Cost overrun prevention', fr: 'Prévention dépassements coûts' },
    roiValue: '-65%',
    kpis: [
      { 
        name: 'Gross Margin %', 
        nameFr: 'Marge brute %', 
        formula: '(Revenue - Direct Costs) / Revenue', 
        target: '15-30%',
        currentValue: 22,
        targetValue: 20,
        trend: 'up',
        trendValue: '+2%',
        impact: 'Better cost control',
        impactFr: 'Meilleur contrôle coûts',
        chartData: [18, 19, 19.5, 20, 21, 21.5, 22],
        industryBenchmark: [16, 16.5, 17, 17.5, 18, 18.5, 19],
      },
      { 
        name: 'Backlog Months', 
        nameFr: 'Carnet (mois)', 
        formula: 'Backlog Value / Avg Monthly Revenue', 
        target: '3-12 months',
        currentValue: 8,
        targetValue: 6,
        trend: 'up',
        trendValue: '+2mo',
        impact: 'Strong pipeline',
        impactFr: 'Pipeline solide',
        chartData: [5, 5.5, 6, 6.5, 7, 7.5, 8],
        industryBenchmark: [4, 4.2, 4.5, 4.8, 5, 5.2, 5.5],
      },
      { 
        name: 'Bid-to-Win Ratio', 
        nameFr: 'Ratio soumissions', 
        formula: 'Won Bids / Total Bids', 
        target: '15-25%',
        currentValue: 24,
        targetValue: 20,
        trend: 'up',
        trendValue: '+4%',
        impact: 'Competitive pricing',
        impactFr: 'Prix compétitifs',
        chartData: [18, 19, 20, 21, 22, 23, 24],
        industryBenchmark: [15, 15.5, 16, 16.5, 17, 17.5, 18],
      },
      { 
        name: 'Job Margin Variance', 
        nameFr: 'Écart marge projet', 
        formula: 'Actual Margin - Estimated', 
        target: '<5%',
        currentValue: 2.1,
        targetValue: 5,
        trend: 'down',
        trendValue: '-1.5%',
        impact: 'Accurate estimates',
        impactFr: 'Estimations précises',
        chartData: [4.5, 4, 3.5, 3, 2.8, 2.4, 2.1],
        industryBenchmark: [6, 5.8, 5.5, 5.2, 5, 4.8, 4.5],
      },
    ],
  },
  {
    id: 'professional_services',
    name: { en: 'Professional Services', fr: 'Services professionnels' },
    icon: Briefcase,
    roiHighlight: { en: 'Billable hours recovered', fr: 'Heures facturables récupérées' },
    roiValue: '+12%',
    kpis: [
      { 
        name: 'Utilization Rate', 
        nameFr: 'Taux d\'utilisation', 
        formula: 'Billable Hours / Available Hours', 
        target: '70-85%',
        currentValue: 78,
        targetValue: 75,
        trend: 'up',
        trendValue: '+3%',
        impact: '+$45K annual revenue',
        impactFr: '+45K$ revenus annuels',
        chartData: [72, 73, 74, 75, 76, 77, 78],
        industryBenchmark: [68, 68.5, 69, 69.5, 70, 70.5, 71],
      },
      { 
        name: 'Realization Rate', 
        nameFr: 'Taux de réalisation', 
        formula: 'Collected / Billed', 
        target: '85-95%',
        currentValue: 92,
        targetValue: 90,
        trend: 'up',
        trendValue: '+2%',
        impact: 'Better collections',
        impactFr: 'Meilleurs recouvrements',
        chartData: [88, 89, 89.5, 90, 91, 91.5, 92],
        industryBenchmark: [85, 85.5, 86, 86.5, 87, 87.5, 88],
      },
      { 
        name: 'Effective Rate', 
        nameFr: 'Taux effectif', 
        formula: 'Collected Revenue / Billable Hours', 
        target: 'Target',
        currentValue: 185,
        targetValue: 175,
        trend: 'up',
        trendValue: '+6%',
        impact: 'Higher value work',
        impactFr: 'Travail à plus haute valeur',
        chartData: [165, 170, 172, 175, 180, 183, 185],
        industryBenchmark: [150, 152, 155, 158, 160, 162, 165],
      },
      { 
        name: 'AR Days', 
        nameFr: 'Jours CC', 
        formula: 'AR Balance / (Annual Rev / 365)', 
        target: '30-45 days',
        currentValue: 32,
        targetValue: 35,
        trend: 'down',
        trendValue: '-5 days',
        impact: 'Faster collections',
        impactFr: 'Recouvrements plus rapides',
        chartData: [42, 40, 38, 36, 35, 33, 32],
        industryBenchmark: [48, 47, 46, 45, 44, 43, 42],
      },
    ],
  },
];

// =====================================================
// MAIN COMPONENT
// =====================================================

interface IndustryKPISectionProps {
  onScheduleCall?: () => void;
}

export default function IndustryKPISection({ onScheduleCall }: IndustryKPISectionProps) {
  const { language } = useI18n();
  const { resolvedTheme } = useTheme();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';
  const [selectedIndustry, setSelectedIndustry] = useState<string>('real_estate');
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const { ref: sectionRef, isInView } = useInView(0.1);
  
  const currentIndustry = INDUSTRY_KPIS.find(ind => ind.id === selectedIndustry) || INDUSTRY_KPIS[0];
  const Icon = currentIndustry.icon;
  
  // Format value for display
  const formatValue = (value: number, name: string): string => {
    if (name.includes('Revenue') || name.includes('NOI') || name.includes('Revenus')) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    if (name.includes('Rate') || name.includes('Taux') || name.includes('%') || name.includes('Margin') || name.includes('Marge')) {
      return `${value}%`;
    }
    if (name.includes('ADR') || name.includes('TJM') || name.includes('Effective') || name.includes('effectif')) {
      return `$${value}`;
    }
    return `${value}`;
  };
  
  return (
    <section 
      ref={sectionRef}
      id="industry-kpis" 
      className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8"
      style={{ 
        background: isDark 
          ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)' 
          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)'
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div 
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold mb-3"
            style={{ 
              background: `${colors.gold}${isDark ? '25' : '15'}`,
              border: `1px solid ${colors.gold}${isDark ? '40' : '25'}`,
              color: isDark ? colors.gold : colors.goldDark
            }}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {isEn ? 'Industry Benchmarks' : 'Références sectorielles'}
          </div>
          
          <h2 
            className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3"
            style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
          >
            {isEn ? 'Beat Your Industry Benchmarks' : 'Dépassez les références de votre secteur'}
          </h2>
          
          <p 
            className="text-sm sm:text-base max-w-2xl mx-auto"
            style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
          >
            {isEn 
              ? 'See exactly where you stand vs. industry leaders. Identify the KPIs dragging down your margins and fix them.'
              : 'Voyez exactement où vous vous situez vs les leaders du secteur. Identifiez les KPIs qui réduisent vos marges et corrigez-les.'}
          </p>
        </div>
        
        {/* Industry Selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {INDUSTRY_KPIS.map((industry) => {
            const TabIcon = industry.icon;
            const isSelected = selectedIndustry === industry.id;
            
            return (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? colors.green : (isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)'),
                  color: isSelected ? 'white' : (isDark ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)'),
                  border: `1px solid ${isSelected ? colors.green : (isDark ? 'rgba(100, 116, 139, 0.5)' : 'rgba(229, 231, 235, 0.8)')}`,
                  boxShadow: isSelected 
                    ? `0 4px 12px ${colors.green}40` 
                    : (isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)'),
                }}
              >
                <TabIcon className="w-4 h-4" style={{ color: isSelected ? 'white' : colors.green }} />
                <span className="hidden sm:inline">
                  {isEn ? industry.name.en.split('/')[0].trim() : industry.name.fr.split('/')[0].trim()}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Dashboard Container */}
        <div 
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ 
            backgroundColor: isDark ? 'rgb(30, 41, 59)' : 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.6)' : 'rgba(229, 231, 235, 0.8)'}`,
            boxShadow: isDark 
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
              : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Browser Chrome */}
          <div 
            className="h-10 flex items-center px-4 gap-3 border-b"
            style={{ 
              backgroundColor: isDark ? 'rgb(15, 23, 42)' : 'rgba(248, 250, 252, 0.98)',
              borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.6)'
            }}
          >
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.gold }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.green }} />
            </div>
            
            {/* Industry Name */}
            <div className="flex-1 flex items-center justify-center gap-2">
              <Icon className="w-4 h-4" style={{ color: colors.green }} />
              <span className="text-[11px] font-semibold" style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)' }}>
                {isEn ? currentIndustry.name.en : currentIndustry.name.fr}
              </span>
            </div>
            
            {/* Live indicator */}
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-medium"
              style={{ backgroundColor: `${colors.green}15`, color: colors.green }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colors.green }} />
              {isEn ? 'Live Data' : 'Données en direct'}
            </div>
          </div>
          
          {/* Main Content */}
          <div 
            className="p-4 sm:p-6"
            style={{
              backgroundColor: isDark ? 'rgb(30, 41, 59)' : 'rgba(255, 255, 255, 0.98)',
            }}
          >
            {/* ROI Highlight Banner */}
            <div 
              className="mb-6 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ 
                background: isDark 
                  ? `linear-gradient(135deg, ${colors.gold}35 0%, ${colors.green}25 100%)`
                  : `linear-gradient(135deg, ${colors.gold}20 0%, ${colors.green}12 100%)`,
                border: `1px solid ${isDark ? `${colors.gold}70` : `${colors.gold}40`}`,
                boxShadow: isDark 
                  ? `0 4px 20px ${colors.gold}20` 
                  : `0 4px 20px ${colors.gold}10`
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ 
                    backgroundColor: `${colors.gold}30`,
                    boxShadow: `0 2px 8px ${colors.gold}20`
                  }}
                >
                  <DollarSign className="w-6 h-6" style={{ color: colors.gold }} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}>
                    {isEn ? 'ROI Highlight' : 'Point ROI'}
                  </p>
                  <p className="text-base font-bold" style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}>
                    {isEn ? currentIndustry.roiHighlight.en : currentIndustry.roiHighlight.fr}
                  </p>
                </div>
              </div>
              <div 
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: colors.gold }}
              >
                {currentIndustry.roiValue}
              </div>
            </div>
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {currentIndustry.kpis.map((kpi, idx) => {
                const isOnTarget = kpi.currentValue >= kpi.targetValue * 0.95 || 
                  (kpi.name.includes('Cost') && kpi.currentValue <= kpi.targetValue * 1.05) ||
                  (kpi.name.includes('Days') && kpi.currentValue <= kpi.targetValue);
                
                return (
                  <div 
                    key={idx}
                    className="p-4 rounded-xl transition-all duration-300 cursor-pointer group"
                    style={{ 
                      backgroundColor: isDark ? 'rgb(51, 65, 85)' : 'rgba(255, 255, 255, 0.98)',
                      border: `1px solid ${hoveredKpi === idx ? colors.green : (isDark ? 'rgba(71, 85, 105, 0.8)' : 'rgba(229, 231, 235, 0.8)')}`,
                      transform: hoveredKpi === idx ? 'translateY(-3px)' : 'none',
                      boxShadow: hoveredKpi === idx 
                        ? `0 12px 24px ${colors.green}30` 
                        : (isDark ? '0 4px 16px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.08)')
                    }}
                    onMouseEnter={() => setHoveredKpi(idx)}
                    onMouseLeave={() => setHoveredKpi(null)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-[11px] font-semibold" style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(71, 85, 105)' }}>
                        {isEn ? kpi.name : kpi.nameFr}
                      </span>
                      <div 
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold"
                        style={{ 
                          backgroundColor: kpi.trend === 'up' 
                            ? `${colors.green}25` 
                            : kpi.trend === 'down' 
                              ? (kpi.name.includes('Cost') || kpi.name.includes('Days') || kpi.name.includes('Coût') || kpi.name.includes('Jours'))
                                ? `${colors.green}25`
                                : '#fee2e225'
                              : `${colors.gold}25`,
                          color: kpi.trend === 'up' 
                            ? colors.green 
                            : kpi.trend === 'down'
                              ? (kpi.name.includes('Cost') || kpi.name.includes('Days') || kpi.name.includes('Coût') || kpi.name.includes('Jours'))
                                ? colors.green
                                : '#ef4444'
                              : colors.gold
                        }}
                      >
                        {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
                         kpi.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : 
                         <Target className="w-3 h-3" />}
                        {kpi.trendValue}
                      </div>
                    </div>
                    
                    {/* Value */}
                    <div className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: colors.green }}>
                      {formatValue(kpi.currentValue, kpi.name)}
                    </div>
                    
                    {/* Chart with Industry Comparison */}
                    <div className="h-12 mb-2">
                      <AnimatedSparkline 
                        data={kpi.chartData} 
                        benchmarkData={kpi.industryBenchmark}
                        color={colors.green}
                        benchmarkColor={isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.6)'}
                        height={48}
                        isVisible={isInView}
                      />
                    </div>
                    
                    {/* Chart Legend */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 rounded" style={{ backgroundColor: colors.green }}></div>
                        <span className="text-[8px] font-medium" style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}>
                          {isEn ? 'You' : 'Vous'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-3 h-0.5 rounded" 
                          style={{ 
                            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.6)',
                            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)'
                          }}
                        ></div>
                        <span className="text-[8px] font-medium" style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(148, 163, 184)' }}>
                          {isEn ? 'Industry' : 'Industrie'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Target & Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium" style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}>
                        {isEn ? 'Target:' : 'Cible:'} {kpi.target}
                      </span>
                      <div className="flex items-center gap-1">
                        {isOnTarget ? (
                          <CheckCircle className="w-4 h-4" style={{ color: colors.green }} />
                        ) : (
                          <AlertCircle className="w-4 h-4" style={{ color: colors.gold }} />
                        )}
                      </div>
                    </div>
                    
                    {/* Impact on hover */}
                    <div 
                      className="mt-3 pt-3 border-t transition-all duration-300"
                      style={{ 
                        borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.8)',
                        opacity: hoveredKpi === idx ? 1 : 0.8,
                        maxHeight: hoveredKpi === idx ? '50px' : '28px',
                      }}
                    >
                      <p className="text-[10px] font-semibold" style={{ color: isDark ? colors.greenLight : colors.green }}>
                        {isEn ? kpi.impact : kpi.impactFr}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Formula Builder - Spreadsheet Style */}
            <div 
              className="rounded-xl overflow-hidden shadow-lg"
              style={{ 
                backgroundColor: isDark ? 'rgb(51, 65, 85)' : 'rgba(255, 255, 255, 0.98)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.7)' : 'rgba(229, 231, 235, 0.8)'}`,
                boxShadow: isDark 
                  ? '0 4px 20px rgba(0, 0, 0, 0.4)' 
                  : '0 4px 20px rgba(0, 0, 0, 0.08)'
              }}
            >
              {/* Header with tabs */}
              <div 
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ 
                  borderColor: isDark ? 'rgba(71, 85, 105, 0.6)' : 'rgba(229, 231, 235, 0.8)',
                  backgroundColor: isDark ? 'rgb(30, 41, 59)' : 'rgba(248, 250, 252, 0.95)'
                }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="p-1.5 rounded-lg"
                    style={{ backgroundColor: `${colors.green}20` }}
                  >
                    <BarChart3 className="w-4 h-4" style={{ color: colors.green }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}>
                    {isEn ? 'Formula Builder' : 'Constructeur de formules'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span 
                    className="text-[10px] px-2.5 py-1 rounded-md font-medium"
                    style={{ backgroundColor: `${colors.green}20`, color: colors.green }}
                  >
                    {isEn ? 'Pre-built' : 'Pré-définies'}
                  </span>
                  <span 
                    className="text-[10px] px-2.5 py-1 rounded-md font-medium"
                    style={{ backgroundColor: `${colors.gold}20`, color: colors.gold }}
                  >
                    {isEn ? 'Custom' : 'Personnalisées'}
                  </span>
                </div>
              </div>
              
              {/* Spreadsheet-like grid */}
              <div className="overflow-x-auto">
                <div style={{ minWidth: '500px' }}>
                  {/* Column headers */}
                  <div 
                    className="grid text-[10px] font-bold uppercase tracking-wider px-4 py-2.5"
                    style={{ 
                      gridTemplateColumns: '1.5fr 2fr 80px 60px',
                      backgroundColor: isDark ? 'rgb(71, 85, 105)' : 'rgba(241, 245, 249, 1)',
                      color: isDark ? 'rgb(248, 250, 252)' : 'rgb(71, 85, 105)',
                      borderBottom: `1px solid ${isDark ? 'rgba(100, 116, 139, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`
                    }}
                  >
                    <span className="text-left">{isEn ? 'Metric' : 'Métrique'}</span>
                    <span className="text-left">{isEn ? 'Formula' : 'Formule'}</span>
                    <span className="text-left">{isEn ? 'Target' : 'Cible'}</span>
                    <span></span>
                  </div>
                  
                  {/* Formula rows */}
                  {currentIndustry.kpis.map((kpi, idx) => (
                    <div 
                      key={idx}
                      className="grid items-center px-4 py-3 border-b transition-all duration-200 cursor-pointer group"
                      style={{ 
                        gridTemplateColumns: '1.5fr 2fr 80px 60px',
                        borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)',
                        backgroundColor: hoveredKpi === idx 
                          ? (isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(241, 245, 249, 1)')
                          : (isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(255, 255, 255, 0.5)')
                      }}
                      onMouseEnter={() => setHoveredKpi(idx)}
                      onMouseLeave={() => setHoveredKpi(null)}
                    >
                      <span 
                        className="text-[11px] font-semibold text-left"
                        style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                      >
                        {isEn ? kpi.name : kpi.nameFr}
                      </span>
                      <div className="flex items-center gap-1.5 justify-start">
                        <code 
                          className="text-[10px] px-2.5 py-1.5 rounded-md font-mono font-medium"
                          style={{ 
                            backgroundColor: isDark ? 'rgba(30, 41, 59, 1)' : 'rgba(241, 245, 249, 1)',
                            color: isDark ? colors.greenLight : colors.green,
                            border: `1px solid ${isDark ? 'rgba(100, 116, 139, 0.8)' : 'rgba(203, 213, 225, 0.8)'}`,
                            boxShadow: isDark ? 'inset 0 1px 2px rgba(0,0,0,0.2)' : 'inset 0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          {kpi.formula}
                        </code>
                      </div>
                      <span 
                        className="text-[10px] px-2.5 py-1 rounded-full font-semibold text-left inline-block"
                        style={{ 
                          backgroundColor: isDark ? `${colors.green}30` : `${colors.green}18`,
                          color: isDark ? colors.greenLight : colors.green
                        }}
                      >
                        {kpi.target}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 rounded-md transition-colors"
                          style={{ backgroundColor: `${colors.gold}20`, color: colors.gold }}
                          title={isEn ? 'Edit formula' : 'Modifier'}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add custom formula row */}
                  <div 
                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-200 hover:bg-opacity-80"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(248, 250, 252, 0.8)',
                    }}
                  >
                    <div 
                      className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                      style={{ 
                        border: `2px dashed ${isDark ? 'rgba(148, 163, 184, 0.6)' : 'rgba(148, 163, 184, 0.8)'}`,
                        color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)'
                      }}
                    >
                      <span className="text-sm font-bold">+</span>
                    </div>
                    <span 
                      className="text-[11px] font-medium"
                      style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}
                    >
                      {isEn ? 'Add custom formula...' : 'Ajouter une formule personnalisée...'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Benchmark Note */}
              {(currentIndustry.profitNote || currentIndustry.benchmarkNote) && (
                <div 
                  className="px-4 py-3.5 flex items-start gap-2.5"
                  style={{ 
                    borderTop: `1px solid ${isDark ? 'rgba(100, 116, 139, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
                    backgroundColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(248, 250, 252, 0.9)'
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: isDark ? '#fbbf24' : colors.gold }} />
                  <p className="text-[11px] font-medium" style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(71, 85, 105)' }}>
                    {isEn 
                      ? (currentIndustry.profitNote?.en || currentIndustry.benchmarkNote?.en)
                      : (currentIndustry.profitNote?.fr || currentIndustry.benchmarkNote?.fr)
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Industry Note + CTA */}
        <div className="mt-8 text-center">
          <p 
            className="text-xs sm:text-sm mb-5 max-w-2xl mx-auto"
            style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1.5" style={{ color: isDark ? colors.greenLight : colors.green }} />
            {isEn 
              ? 'AI-optimized for 15+ Canadian industries: Real Estate, Restaurant, Hospitality, Construction, Retail, Professional Services, Manufacturing, Transport, Agriculture, and more.'
              : 'IA optimisée pour plus de 15 industries canadiennes: Immobilier, Restauration, Hôtellerie, Construction, Commerce de détail, Services professionnels, Fabrication, Transport, Agriculture, et plus.'}
          </p>
          
          <button 
            onClick={onScheduleCall}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 text-sm group"
            style={{ 
              background: `linear-gradient(135deg, ${colors.green} 0%, ${colors.greenDark} 100%)`,
              boxShadow: `0 4px 16px ${colors.green}35`
            }}
          >
            {isEn ? 'See your industry benchmarks free' : 'Voyez vos benchmarks sectoriels gratuitement'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}

export { INDUSTRY_KPIS };
export type { IndustryData, KPIDefinition };
