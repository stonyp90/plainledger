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
  DollarSign,
  BarChart3,
  Factory,
  Wheat,
  Truck,
  Heart,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import KPICard from './KPICard';

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
  icon: LucideIcon;
  kpis: KPIDefinition[];
  profitNote?: { en: string; fr: string };
  benchmarkNote?: { en: string; fr: string };
  roiHighlight: { en: string; fr: string };
  roiValue: string;
}

export const INDUSTRY_KPIS: IndustryData[] = [
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
      { 
        name: 'DSCR', 
        nameFr: 'Ratio de couverture dette', 
        formula: 'NOI / Debt Service', 
        target: '>1.25x',
        currentValue: 1.35,
        targetValue: 1.25,
        trend: 'up',
        trendValue: '+8%',
        impact: 'Strong debt coverage',
        impactFr: 'Forte couverture dette',
        chartData: [1.20, 1.22, 1.25, 1.28, 1.30, 1.32, 1.35],
        industryBenchmark: [1.15, 1.16, 1.17, 1.18, 1.19, 1.20, 1.21],
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
  {
    id: 'manufacturing',
    name: { en: 'Manufacturing', fr: 'Fabrication' },
    icon: Factory,
    roiHighlight: { en: 'Production efficiency gains', fr: 'Gains efficacité production' },
    roiValue: '+15%',
    kpis: [
      { 
        name: 'Gross Margin %', 
        nameFr: 'Marge brute %', 
        formula: '(Revenue - COGS) / Revenue', 
        target: '20-35%',
        currentValue: 28.5,
        targetValue: 25,
        trend: 'up',
        trendValue: '+3.5%',
        impact: '+$42K annual profit',
        impactFr: '+42K$ profit annuel',
        chartData: [24, 25, 25.5, 26, 27, 27.8, 28.5],
        industryBenchmark: [22, 22.5, 23, 23.5, 24, 24.5, 25],
      },
      { 
        name: 'On-Time Delivery', 
        nameFr: 'Livraison à temps', 
        formula: 'On-Time Orders / Total Orders', 
        target: '>95%',
        currentValue: 96.5,
        targetValue: 95,
        trend: 'up',
        trendValue: '+1.5%',
        impact: 'Customer satisfaction',
        impactFr: 'Satisfaction client',
        chartData: [94, 94.5, 95, 95.5, 96, 96.2, 96.5],
        industryBenchmark: [92, 92.5, 93, 93.5, 94, 94.5, 95],
      },
      { 
        name: 'Inventory Turnover', 
        nameFr: 'Rotation stocks', 
        formula: 'COGS / Avg Inventory', 
        target: '6-12x/year',
        currentValue: 9.2,
        targetValue: 8,
        trend: 'up',
        trendValue: '+1.2x',
        impact: 'Reduced carrying costs',
        impactFr: 'Coûts stockage réduits',
        chartData: [7.5, 7.8, 8, 8.3, 8.6, 8.9, 9.2],
        industryBenchmark: [6.5, 6.7, 6.9, 7.1, 7.3, 7.5, 7.7],
      },
      { 
        name: 'Production Efficiency', 
        nameFr: 'Efficacité production', 
        formula: 'Actual Output / Planned Output', 
        target: '>90%',
        currentValue: 94,
        targetValue: 90,
        trend: 'up',
        trendValue: '+4%',
        impact: 'Optimized operations',
        impactFr: 'Opérations optimisées',
        chartData: [88, 89, 90, 91, 92, 93, 94],
        industryBenchmark: [85, 85.5, 86, 86.5, 87, 87.5, 88],
      },
      { 
        name: 'ROI', 
        nameFr: 'ROI', 
        formula: '(Profit - Investment) / Investment', 
        target: '>15%',
        currentValue: 18.5,
        targetValue: 15,
        trend: 'up',
        trendValue: '+3.5%',
        impact: 'Strong returns',
        impactFr: 'Forts rendements',
        chartData: [14, 14.5, 15, 16, 17, 17.8, 18.5],
        industryBenchmark: [12, 12.5, 13, 13.5, 14, 14.5, 15],
      },
    ],
  },
  {
    id: 'agriculture',
    name: { en: 'Agriculture', fr: 'Agriculture' },
    icon: Wheat,
    roiHighlight: { en: 'Yield optimization savings', fr: 'Économies optimisation rendement' },
    roiValue: '+22%',
    kpis: [
      { 
        name: 'Yield per Hectare', 
        nameFr: 'Rendement par hectare', 
        formula: 'Total Production / Hectares', 
        target: 'Target',
        currentValue: 8.5,
        targetValue: 7.5,
        trend: 'up',
        trendValue: '+13%',
        impact: '+$18K revenue',
        impactFr: '+18K$ revenus',
        chartData: [7.0, 7.2, 7.4, 7.6, 7.8, 8.2, 8.5],
        industryBenchmark: [6.5, 6.6, 6.7, 6.8, 6.9, 7.0, 7.1],
      },
      { 
        name: 'Cost per Unit', 
        nameFr: 'Coût par unité', 
        formula: 'Total Costs / Units Produced', 
        target: 'Minimize',
        currentValue: 2.85,
        targetValue: 3.00,
        trend: 'down',
        trendValue: '-5%',
        impact: 'Cost efficiency',
        impactFr: 'Efficacité coûts',
        chartData: [3.2, 3.1, 3.05, 3.0, 2.95, 2.90, 2.85],
        industryBenchmark: [3.4, 3.35, 3.3, 3.25, 3.2, 3.15, 3.1],
      },
      { 
        name: 'Profit Margin %', 
        nameFr: 'Marge bénéficiaire %', 
        formula: '(Revenue - Costs) / Revenue', 
        target: '15-25%',
        currentValue: 21.5,
        targetValue: 18,
        trend: 'up',
        trendValue: '+3.5%',
        impact: 'Strong profitability',
        impactFr: 'Forte rentabilité',
        chartData: [17, 17.5, 18, 19, 20, 20.8, 21.5],
        industryBenchmark: [15, 15.5, 16, 16.5, 17, 17.5, 18],
      },
      { 
        name: 'Crop Rotation Efficiency', 
        nameFr: 'Efficacité rotation', 
        formula: 'Optimal Rotation / Actual', 
        target: '>85%',
        currentValue: 88,
        targetValue: 85,
        trend: 'up',
        trendValue: '+3%',
        impact: 'Soil health',
        impactFr: 'Santé sol',
        chartData: [83, 84, 85, 86, 87, 87.5, 88],
        industryBenchmark: [80, 81, 82, 83, 84, 84.5, 85],
      },
    ],
  },
  {
    id: 'transport',
    name: { en: 'Transportation', fr: 'Transport' },
    icon: Truck,
    roiHighlight: { en: 'Route optimization savings', fr: 'Économies optimisation routes' },
    roiValue: '$8,500/mo',
    kpis: [
      { 
        name: 'Revenue per Mile', 
        nameFr: 'Revenus par mile', 
        formula: 'Total Revenue / Miles Driven', 
        target: '$2.50-4.00',
        currentValue: 3.45,
        targetValue: 3.20,
        trend: 'up',
        trendValue: '+8%',
        impact: '+$12K annual',
        impactFr: '+12K$ annuel',
        chartData: [3.0, 3.1, 3.15, 3.2, 3.3, 3.38, 3.45],
        industryBenchmark: [2.8, 2.85, 2.9, 2.95, 3.0, 3.05, 3.1],
      },
      { 
        name: 'Fuel Efficiency', 
        nameFr: 'Efficacité carburant', 
        formula: 'Miles / Gallon', 
        target: '>6.5 MPG',
        currentValue: 7.2,
        targetValue: 6.5,
        trend: 'up',
        trendValue: '+11%',
        impact: 'Lower fuel costs',
        impactFr: 'Coûts carburant réduits',
        chartData: [6.2, 6.4, 6.5, 6.7, 6.9, 7.0, 7.2],
        industryBenchmark: [6.0, 6.05, 6.1, 6.15, 6.2, 6.25, 6.3],
      },
      { 
        name: 'Utilization Rate', 
        nameFr: 'Taux utilisation', 
        formula: 'Loaded Miles / Total Miles', 
        target: '>75%',
        currentValue: 82,
        targetValue: 75,
        trend: 'up',
        trendValue: '+7%',
        impact: 'Better asset use',
        impactFr: 'Meilleure utilisation',
        chartData: [73, 74, 75, 77, 79, 80.5, 82],
        industryBenchmark: [70, 71, 72, 73, 74, 74.5, 75],
      },
      { 
        name: 'On-Time Delivery', 
        nameFr: 'Livraison à temps', 
        formula: 'On-Time / Total Deliveries', 
        target: '>95%',
        currentValue: 97.2,
        targetValue: 95,
        trend: 'up',
        trendValue: '+2.2%',
        impact: 'Customer satisfaction',
        impactFr: 'Satisfaction client',
        chartData: [94, 94.5, 95, 95.8, 96.5, 96.8, 97.2],
        industryBenchmark: [92, 92.5, 93, 93.5, 94, 94.5, 95],
      },
    ],
  },
  {
    id: 'healthcare',
    name: { en: 'Healthcare', fr: 'Santé' },
    icon: Heart,
    roiHighlight: { en: 'Patient retention improvement', fr: 'Amélioration rétention patients' },
    roiValue: '+28%',
    kpis: [
      { 
        name: 'Revenue per Patient', 
        nameFr: 'Revenus par patient', 
        formula: 'Total Revenue / Patients', 
        target: 'Growth',
        currentValue: 485,
        targetValue: 450,
        trend: 'up',
        trendValue: '+8%',
        impact: '+$35K revenue',
        impactFr: '+35K$ revenus',
        chartData: [420, 430, 440, 450, 460, 475, 485],
        industryBenchmark: [400, 405, 410, 415, 420, 425, 430],
      },
      { 
        name: 'Patient Retention', 
        nameFr: 'Rétention patients', 
        formula: 'Returning Patients / Total', 
        target: '>70%',
        currentValue: 76,
        targetValue: 70,
        trend: 'up',
        trendValue: '+6%',
        impact: 'Loyalty program working',
        impactFr: 'Programme fidélité efficace',
        chartData: [68, 69, 70, 72, 74, 75, 76],
        industryBenchmark: [65, 66, 67, 68, 69, 69.5, 70],
      },
      { 
        name: 'Appointment Utilization', 
        nameFr: 'Utilisation rendez-vous', 
        formula: 'Scheduled / Available Slots', 
        target: '>85%',
        currentValue: 89,
        targetValue: 85,
        trend: 'up',
        trendValue: '+4%',
        impact: 'Better scheduling',
        impactFr: 'Meilleure planification',
        chartData: [83, 84, 85, 86, 87, 88, 89],
        industryBenchmark: [80, 81, 82, 83, 84, 84.5, 85],
      },
      { 
        name: 'Net Margin %', 
        nameFr: 'Marge nette %', 
        formula: 'Net Income / Revenue', 
        target: '12-20%',
        currentValue: 16.5,
        targetValue: 15,
        trend: 'up',
        trendValue: '+1.5%',
        impact: 'Strong profitability',
        impactFr: 'Forte rentabilité',
        chartData: [14, 14.5, 15, 15.5, 16, 16.2, 16.5],
        industryBenchmark: [12, 12.5, 13, 13.5, 14, 14.5, 15],
      },
    ],
  },
  {
    id: 'education',
    name: { en: 'Education', fr: 'Éducation' },
    icon: GraduationCap,
    roiHighlight: { en: 'Student retention improvement', fr: 'Amélioration rétention étudiants' },
    roiValue: '+18%',
    kpis: [
      { 
        name: 'Student Retention', 
        nameFr: 'Rétention étudiants', 
        formula: 'Returning Students / Total', 
        target: '>85%',
        currentValue: 89,
        targetValue: 85,
        trend: 'up',
        trendValue: '+4%',
        impact: 'Program quality',
        impactFr: 'Qualité programme',
        chartData: [83, 84, 85, 86, 87, 88, 89],
        industryBenchmark: [80, 81, 82, 83, 84, 84.5, 85],
      },
      { 
        name: 'Revenue per Student', 
        nameFr: 'Revenus par étudiant', 
        formula: 'Total Revenue / Students', 
        target: 'Growth',
        currentValue: 12500,
        targetValue: 11500,
        trend: 'up',
        trendValue: '+9%',
        impact: '+$1K per student',
        impactFr: '+1K$ par étudiant',
        chartData: [11000, 11200, 11400, 11500, 11800, 12200, 12500],
        industryBenchmark: [10500, 10600, 10700, 10800, 10900, 11000, 11100],
      },
      { 
        name: 'Class Utilization', 
        nameFr: 'Utilisation classes', 
        formula: 'Enrolled / Capacity', 
        target: '>80%',
        currentValue: 86,
        targetValue: 80,
        trend: 'up',
        trendValue: '+6%',
        impact: 'Optimal capacity',
        impactFr: 'Capacité optimale',
        chartData: [78, 79, 80, 82, 84, 85, 86],
        industryBenchmark: [75, 76, 77, 78, 79, 79.5, 80],
      },
      { 
        name: 'Net Margin %', 
        nameFr: 'Marge nette %', 
        formula: 'Net Income / Revenue', 
        target: '8-15%',
        currentValue: 12.5,
        targetValue: 10,
        trend: 'up',
        trendValue: '+2.5%',
        impact: 'Sustainable growth',
        impactFr: 'Croissance durable',
        chartData: [9.5, 10, 10.5, 11, 11.5, 12, 12.5],
        industryBenchmark: [8, 8.5, 9, 9.5, 10, 10.5, 11],
      },
    ],
  },
  {
    id: 'wholesale',
    name: { en: 'Wholesale', fr: 'Commerce de gros' },
    icon: ShoppingBag,
    roiHighlight: { en: 'Inventory optimization', fr: 'Optimisation inventaire' },
    roiValue: '$15K/yr',
    kpis: [
      { 
        name: 'Gross Margin %', 
        nameFr: 'Marge brute %', 
        formula: '(Revenue - COGS) / Revenue', 
        target: '15-25%',
        currentValue: 22.5,
        targetValue: 20,
        trend: 'up',
        trendValue: '+2.5%',
        impact: '+$28K profit',
        impactFr: '+28K$ profit',
        chartData: [19, 19.5, 20, 20.5, 21, 21.8, 22.5],
        industryBenchmark: [17, 17.5, 18, 18.5, 19, 19.5, 20],
      },
      { 
        name: 'Inventory Turnover', 
        nameFr: 'Rotation stocks', 
        formula: 'COGS / Avg Inventory', 
        target: '6-10x/year',
        currentValue: 8.8,
        targetValue: 8,
        trend: 'up',
        trendValue: '+0.8x',
        impact: 'Reduced carrying costs',
        impactFr: 'Coûts stockage réduits',
        chartData: [7.5, 7.8, 8, 8.2, 8.4, 8.6, 8.8],
        industryBenchmark: [6.5, 6.7, 6.9, 7.1, 7.3, 7.5, 7.7],
      },
      { 
        name: 'Order Fill Rate', 
        nameFr: 'Taux remplissage commandes', 
        formula: 'Filled Orders / Total Orders', 
        target: '>95%',
        currentValue: 97.5,
        targetValue: 95,
        trend: 'up',
        trendValue: '+2.5%',
        impact: 'Customer satisfaction',
        impactFr: 'Satisfaction client',
        chartData: [94, 94.5, 95, 95.8, 96.5, 97, 97.5],
        industryBenchmark: [92, 92.5, 93, 93.5, 94, 94.5, 95],
      },
      { 
        name: 'Days Sales Outstanding', 
        nameFr: 'Jours ventes en attente', 
        formula: 'AR / (Revenue / 365)', 
        target: '<45 days',
        currentValue: 38,
        targetValue: 45,
        trend: 'down',
        trendValue: '-7 days',
        impact: 'Faster collections',
        impactFr: 'Recouvrements rapides',
        chartData: [48, 46, 44, 42, 40, 39, 38],
        industryBenchmark: [52, 50, 48, 46, 44, 42, 40],
      },
    ],
  },
  {
    id: 'automotive',
    name: { en: 'Automotive', fr: 'Automobile' },
    icon: Truck,
    roiHighlight: { en: 'Service revenue increase', fr: 'Augmentation revenus service' },
    roiValue: '+24%',
    kpis: [
      { 
        name: 'Service Revenue %', 
        nameFr: 'Revenus service %', 
        formula: 'Service Revenue / Total', 
        target: '>40%',
        currentValue: 45,
        targetValue: 40,
        trend: 'up',
        trendValue: '+5%',
        impact: '+$42K revenue',
        impactFr: '+42K$ revenus',
        chartData: [38, 39, 40, 41, 42, 43.5, 45],
        industryBenchmark: [35, 36, 37, 38, 39, 39.5, 40],
      },
      { 
        name: 'Gross Margin %', 
        nameFr: 'Marge brute %', 
        formula: '(Revenue - COGS) / Revenue', 
        target: '18-28%',
        currentValue: 24.5,
        targetValue: 22,
        trend: 'up',
        trendValue: '+2.5%',
        impact: 'Better pricing',
        impactFr: 'Meilleur prix',
        chartData: [21, 21.5, 22, 22.5, 23, 24, 24.5],
        industryBenchmark: [19, 19.5, 20, 20.5, 21, 21.5, 22],
      },
      { 
        name: 'Customer Retention', 
        nameFr: 'Rétention clients', 
        formula: 'Returning Customers / Total', 
        target: '>60%',
        currentValue: 68,
        targetValue: 60,
        trend: 'up',
        trendValue: '+8%',
        impact: 'Loyalty program',
        impactFr: 'Programme fidélité',
        chartData: [58, 59, 60, 62, 64, 66, 68],
        industryBenchmark: [55, 56, 57, 58, 59, 59.5, 60],
      },
      { 
        name: 'ROI', 
        nameFr: 'ROI', 
        formula: '(Profit - Investment) / Investment', 
        target: '>20%',
        currentValue: 24.5,
        targetValue: 20,
        trend: 'up',
        trendValue: '+4.5%',
        impact: 'Strong returns',
        impactFr: 'Forts rendements',
        chartData: [18, 19, 20, 21, 22, 23.5, 24.5],
        industryBenchmark: [16, 16.5, 17, 17.5, 18, 18.5, 19],
      },
    ],
  },
  {
    id: 'beauty_wellness',
    name: { en: 'Beauty & Wellness', fr: 'Beauté & Bien-être' },
    icon: Heart,
    roiHighlight: { en: 'Client retention improvement', fr: 'Amélioration rétention clients' },
    roiValue: '+32%',
    kpis: [
      { 
        name: 'Revenue per Client', 
        nameFr: 'Revenus par client', 
        formula: 'Total Revenue / Clients', 
        target: 'Growth',
        currentValue: 285,
        targetValue: 250,
        trend: 'up',
        trendValue: '+14%',
        impact: '+$35 per client',
        impactFr: '+35$ par client',
        chartData: [240, 245, 250, 260, 270, 278, 285],
        industryBenchmark: [220, 225, 230, 235, 240, 245, 250],
      },
      { 
        name: 'Client Retention', 
        nameFr: 'Rétention clients', 
        formula: 'Returning Clients / Total', 
        target: '>65%',
        currentValue: 72,
        targetValue: 65,
        trend: 'up',
        trendValue: '+7%',
        impact: 'Loyalty program',
        impactFr: 'Programme fidélité',
        chartData: [63, 64, 65, 67, 69, 70.5, 72],
        industryBenchmark: [60, 61, 62, 63, 64, 64.5, 65],
      },
      { 
        name: 'Service Utilization', 
        nameFr: 'Utilisation services', 
        formula: 'Booked Hours / Available', 
        target: '>75%',
        currentValue: 82,
        targetValue: 75,
        trend: 'up',
        trendValue: '+7%',
        impact: 'Better scheduling',
        impactFr: 'Meilleure planification',
        chartData: [72, 73, 75, 77, 79, 80.5, 82],
        industryBenchmark: [70, 71, 72, 73, 74, 74.5, 75],
      },
      { 
        name: 'Net Margin %', 
        nameFr: 'Marge nette %', 
        formula: 'Net Income / Revenue', 
        target: '15-25%',
        currentValue: 21.5,
        targetValue: 18,
        trend: 'up',
        trendValue: '+3.5%',
        impact: 'Strong profitability',
        impactFr: 'Forte rentabilité',
        chartData: [16, 17, 18, 19, 20, 20.8, 21.5],
        industryBenchmark: [14, 14.5, 15, 15.5, 16, 16.5, 17],
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
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 px-2">
          {INDUSTRY_KPIS.map((industry) => {
            const TabIcon = industry.icon;
            const isSelected = selectedIndustry === industry.id;
            
            return (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry.id)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? colors.green : (isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)'),
                  color: isSelected ? 'white' : (isDark ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)'),
                  border: `1px solid ${isSelected ? colors.green : (isDark ? 'rgba(100, 116, 139, 0.5)' : 'rgba(229, 231, 235, 0.8)')}`,
                  boxShadow: isSelected 
                    ? `0 4px 12px ${colors.green}40` 
                    : (isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)'),
                }}
              >
                <TabIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" color={isSelected ? 'white' : colors.green} />
                <span className="hidden min-[375px]:inline">
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
            <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 min-w-0">
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" color={colors.green} />
              <span className="text-[10px] sm:text-[11px] font-semibold truncate" style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)' }}>
                {isEn ? currentIndustry.name.en : currentIndustry.name.fr}
              </span>
            </div>
            
            {/* Live indicator */}
            <div 
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-medium flex-shrink-0"
              style={{ backgroundColor: `${colors.green}15`, color: colors.green }}
            >
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: colors.green }} />
              <span className="hidden min-[375px]:inline">{isEn ? 'Live Data' : 'Données en direct'}</span>
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
              className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4"
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
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: `${colors.gold}30`,
                      boxShadow: `0 2px 8px ${colors.gold}20`
                    }}
                  >
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.gold }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider" style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}>
                      {isEn ? 'ROI Highlight' : 'Point ROI'}
                    </p>
                    <p className="text-sm sm:text-base font-bold truncate" style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}>
                      {isEn ? currentIndustry.roiHighlight.en : currentIndustry.roiHighlight.fr}
                    </p>
                  </div>
                </div>
                <div 
                  className="text-xl sm:text-2xl lg:text-3xl font-bold flex-shrink-0"
                  style={{ color: colors.gold }}
                >
                  {currentIndustry.roiValue}
                </div>
              </div>
            </div>
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
              {currentIndustry.kpis.map((kpi, idx) => {
                const isOnTarget = kpi.currentValue >= kpi.targetValue * 0.95 || 
                  (kpi.name.includes('Cost') && kpi.currentValue <= kpi.targetValue * 1.05) ||
                  (kpi.name.includes('Days') && kpi.currentValue <= kpi.targetValue);
                
                const isGoodWhenDown = kpi.name.includes('Cost') || kpi.name.includes('Days') || 
                  kpi.name.includes('Coût') || kpi.name.includes('Jours');
                
                return (
                  <KPICard
                    key={idx}
                    id={`kpi-${idx}`}
                    label={isEn ? kpi.name : kpi.nameFr}
                    value={formatValue(kpi.currentValue, kpi.name)}
                    target={`${isEn ? 'Target:' : 'Cible:'} ${kpi.target}`}
                    change={kpi.trendValue}
                    trend={kpi.trend}
                    isGoodWhenDown={isGoodWhenDown}
                    chartData={kpi.chartData}
                    benchmarkData={kpi.industryBenchmark}
                    impact={isEn ? kpi.impact : kpi.impactFr}
                    isOnTarget={isOnTarget}
                    isEn={isEn}
                    isHovered={hoveredKpi === idx}
                    onHoverChange={(hovered) => setHoveredKpi(hovered ? idx : null)}
                    isVisible={isInView}
                    animateChart={true}
                  />
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
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-3 sm:px-4 py-2.5 sm:py-3 border-b"
                style={{ 
                  borderColor: isDark ? 'rgba(71, 85, 105, 0.6)' : 'rgba(229, 231, 235, 0.8)',
                  backgroundColor: isDark ? 'rgb(30, 41, 59)' : 'rgba(248, 250, 252, 0.95)'
                }}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div 
                    className="p-1 sm:p-1.5 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${colors.green}20` }}
                  >
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: colors.green }} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}>
                    {isEn ? 'Formula Builder' : 'Constructeur de formules'}
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span 
                    className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium"
                    style={{ backgroundColor: `${colors.green}20`, color: colors.green }}
                  >
                    {isEn ? 'Pre-built' : 'Pré-définies'}
                  </span>
                  <span 
                    className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium"
                    style={{ backgroundColor: `${colors.gold}20`, color: colors.gold }}
                  >
                    {isEn ? 'Custom' : 'Personnalisées'}
                  </span>
                </div>
              </div>
              
              {/* Spreadsheet-like grid */}
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[320px] sm:min-w-[500px]">
                  {/* Column headers */}
                  <div 
                    className="grid text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-3 sm:px-4 py-2 sm:py-2.5"
                    style={{ 
                      gridTemplateColumns: 'minmax(100px, 1.5fr) minmax(120px, 2fr) minmax(60px, 80px) minmax(40px, 60px)',
                      backgroundColor: isDark ? 'rgb(71, 85, 105)' : 'rgba(241, 245, 249, 1)',
                      color: isDark ? 'rgb(248, 250, 252)' : 'rgb(71, 85, 105)',
                      borderBottom: `1px solid ${isDark ? 'rgba(100, 116, 139, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`
                    }}
                  >
                    <span className="text-left truncate">{isEn ? 'Metric' : 'Métrique'}</span>
                    <span className="text-left truncate">{isEn ? 'Formula' : 'Formule'}</span>
                    <span className="text-left truncate">{isEn ? 'Target' : 'Cible'}</span>
                    <span></span>
                  </div>
                  
                  {/* Formula rows */}
                  {currentIndustry.kpis.map((kpi, idx) => (
                    <div 
                      key={idx}
                      className="grid items-center px-3 sm:px-4 py-2 sm:py-3 border-b transition-all duration-200 cursor-pointer group"
                      style={{ 
                        gridTemplateColumns: 'minmax(100px, 1.5fr) minmax(120px, 2fr) minmax(60px, 80px) minmax(40px, 60px)',
                        borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)',
                        backgroundColor: hoveredKpi === idx 
                          ? (isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(241, 245, 249, 1)')
                          : (isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(255, 255, 255, 0.5)')
                      }}
                      onMouseEnter={() => setHoveredKpi(idx)}
                      onMouseLeave={() => setHoveredKpi(null)}
                    >
                      <span 
                        className="text-[9px] sm:text-[10px] font-semibold text-left leading-tight line-clamp-2"
                        style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                        title={isEn ? kpi.name : kpi.nameFr}
                      >
                        {isEn ? kpi.name : kpi.nameFr}
                      </span>
                      <div className="flex items-center gap-1 sm:gap-1.5 justify-start min-w-0">
                        <code 
                          className="text-[8px] sm:text-[9px] px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-md font-mono font-medium leading-tight"
                          title={kpi.formula}
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
                        className="text-[8px] sm:text-[9px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold text-left inline-block whitespace-nowrap"
                        style={{ 
                          backgroundColor: isDark ? `${colors.green}30` : `${colors.green}18`,
                          color: isDark ? colors.greenLight : colors.green
                        }}
                        title={kpi.target}
                      >
                        {kpi.target}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1 sm:p-1.5 rounded-md transition-colors"
                          style={{ backgroundColor: `${colors.gold}20`, color: colors.gold }}
                          title={isEn ? 'Edit formula' : 'Modifier'}
                        >
                          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add custom formula row */}
                  <div 
                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3.5 cursor-pointer transition-all duration-200 hover:bg-opacity-80"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(248, 250, 252, 0.8)',
                    }}
                  >
                    <div 
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0"
                      style={{ 
                        border: `2px dashed ${isDark ? 'rgba(148, 163, 184, 0.6)' : 'rgba(148, 163, 184, 0.8)'}`,
                        color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)'
                      }}
                    >
                      <span className="text-xs sm:text-sm font-bold">+</span>
                    </div>
                    <span 
                      className="text-[10px] sm:text-[11px] font-medium truncate"
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

export type { IndustryData, KPIDefinition };
