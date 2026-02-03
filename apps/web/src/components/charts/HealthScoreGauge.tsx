import { useMemo, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, Info, Activity, TrendingDown, BarChart3, Building2, ChevronDown } from 'lucide-react';
import { LabelTooltip } from '../Tooltip';

interface HealthMetric {
  id: string;
  name: string;
  nameEn: string;
  value: number; // 0-100
  status: 'good' | 'warning' | 'critical';
  description?: string;
  descriptionEn?: string;
}

interface AnomalySummary {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  description?: string;
}

interface HealthScoreGaugeProps {
  score: number; // 0-100
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  size?: 'sm' | 'md' | 'lg';
  previousScore?: number;
  isEn?: boolean;
  onClick?: () => void;
  // New props for detailed metrics
  metrics?: HealthMetric[];
  // New props for merged Top Risks section
  topRisks?: string[];
  // Anomaly summaries for display
  anomalies?: AnomalySummary[];
  // Industry info
  industry?: { id?: string; name: string; nameEn: string };
  // Whether to show industry-specific KPI metrics (default: false)
  showIndustryMetrics?: boolean;
}

// Industry-specific KPI metrics with ROI focus
const INDUSTRY_METRICS: Record<string, HealthMetric[]> = {
  // Real Estate - Property investment ROI focused
  real_estate: [
    {
      id: 'occupancy',
      name: 'Taux d\'occupation',
      nameEn: 'Occupancy Rate',
      value: 92,
      status: 'good',
      description: 'ROI: Chaque 1% = ~$12K/an de revenu',
      descriptionEn: 'ROI: Each 1% = ~$12K/year revenue',
    },
    {
      id: 'noi',
      name: 'Marge NOI',
      nameEn: 'NOI Margin',
      value: 78,
      status: 'good',
      description: 'ROI: Marge nette de 48% sur revenus',
      descriptionEn: 'ROI: 48% net margin on revenue',
    },
    {
      id: 'dscr',
      name: 'Couverture dette (DSCR)',
      nameEn: 'Debt Coverage (DSCR)',
      value: 72,
      status: 'good',
      description: 'ROI: 1.35x coverage = prêt sécurisé',
      descriptionEn: 'ROI: 1.35x coverage = secured loan',
    },
    {
      id: 'cap_rate',
      name: 'Taux de capitalisation',
      nameEn: 'Cap Rate',
      value: 85,
      status: 'good',
      description: 'ROI: 6.2% rendement annuel sur valeur',
      descriptionEn: 'ROI: 6.2% annual yield on value',
    },
    {
      id: 'rent_collection',
      name: 'Recouvrement loyers',
      nameEn: 'Rent Collection',
      value: 88,
      status: 'good',
      description: 'ROI: 88% collecté = $4.8K à récupérer',
      descriptionEn: 'ROI: 88% collected = $4.8K to recover',
    },
  ],

  // Retail - Inventory and sales efficiency ROI
  retail: [
    {
      id: 'gmroi',
      name: 'GMROI',
      nameEn: 'GMROI',
      value: 60,
      status: 'warning',
      description: 'ROI: $1.80 retour par $1 inventaire (cible: $3)',
      descriptionEn: 'ROI: $1.80 return per $1 inventory (target: $3)',
    },
    {
      id: 'sales_sqft',
      name: 'Ventes par pi²',
      nameEn: 'Sales per Sq Ft',
      value: 68,
      status: 'warning',
      description: 'ROI: $285/pi² vs référence $420 (-32%)',
      descriptionEn: 'ROI: $285/sqft vs benchmark $420 (-32%)',
    },
    {
      id: 'inventory_turn',
      name: 'Rotation inventaire',
      nameEn: 'Inventory Turnover',
      value: 75,
      status: 'good',
      description: 'ROI: 4.2x/an = $62K cash libéré',
      descriptionEn: 'ROI: 4.2x/year = $62K cash freed',
    },
    {
      id: 'shrinkage',
      name: 'Perte de stock',
      nameEn: 'Shrinkage Rate',
      value: 38,
      status: 'critical',
      description: 'ROI: 3.8% perdu = $28.5K/an à récupérer',
      descriptionEn: 'ROI: 3.8% lost = $28.5K/year to recover',
    },
    {
      id: 'gross_margin',
      name: 'Marge brute',
      nameEn: 'Gross Margin',
      value: 82,
      status: 'good',
      description: 'ROI: Marge de 42% sur ventes',
      descriptionEn: 'ROI: 42% margin on sales',
    },
  ],

  // Restaurant - Food service profitability
  restaurant: [
    {
      id: 'food_cost',
      name: 'Coût nourriture %',
      nameEn: 'Food Cost %',
      value: 62,
      status: 'warning',
      description: 'ROI: 38% vs cible 28% = $18.5K à économiser',
      descriptionEn: 'ROI: 38% vs 28% target = $18.5K to save',
    },
    {
      id: 'labor_cost',
      name: 'Coût main-d\'œuvre %',
      nameEn: 'Labor Cost %',
      value: 58,
      status: 'warning',
      description: 'ROI: 42% vs cible 32% = $24K en trop',
      descriptionEn: 'ROI: 42% vs 32% target = $24K excess',
    },
    {
      id: 'prime_cost',
      name: 'Coût principal',
      nameEn: 'Prime Cost',
      value: 55,
      status: 'warning',
      description: 'ROI: Prime cost à 72% (cible: <65%)',
      descriptionEn: 'ROI: Prime cost at 72% (target: <65%)',
    },
    {
      id: 'table_turn',
      name: 'Rotation tables',
      nameEn: 'Table Turnover',
      value: 85,
      status: 'good',
      description: 'ROI: 2.8x/service = revenu optimisé',
      descriptionEn: 'ROI: 2.8x/service = optimized revenue',
    },
    {
      id: 'avg_ticket',
      name: 'Ticket moyen',
      nameEn: 'Average Ticket',
      value: 78,
      status: 'good',
      description: 'ROI: $48/client (+8% vs mois dernier)',
      descriptionEn: 'ROI: $48/guest (+8% vs last month)',
    },
  ],

  // Hospitality - Hotel revenue management
  hospitality: [
    {
      id: 'revpar',
      name: 'RevPAR',
      nameEn: 'RevPAR',
      value: 58,
      status: 'warning',
      description: 'ROI: $72 vs marché $95 = $45K manquant/mois',
      descriptionEn: 'ROI: $72 vs market $95 = $45K missing/mo',
    },
    {
      id: 'occupancy',
      name: 'Taux d\'occupation',
      nameEn: 'Occupancy Rate',
      value: 75,
      status: 'good',
      description: 'ROI: 75% occupé = potentiel 25% restant',
      descriptionEn: 'ROI: 75% occupied = 25% potential left',
    },
    {
      id: 'adr',
      name: 'Tarif journalier (ADR)',
      nameEn: 'Average Daily Rate',
      value: 82,
      status: 'good',
      description: 'ROI: $142/nuit vs comp set $135',
      descriptionEn: 'ROI: $142/night vs comp set $135',
    },
    {
      id: 'goppar',
      name: 'GOP par chambre',
      nameEn: 'GOPPAR',
      value: 68,
      status: 'warning',
      description: 'ROI: $48 profit brut/chambre disponible',
      descriptionEn: 'ROI: $48 gross profit/available room',
    },
    {
      id: 'ancillary',
      name: 'Revenus annexes',
      nameEn: 'Ancillary Revenue',
      value: 45,
      status: 'warning',
      description: 'ROI: 12% des revenus (cible: 20%)',
      descriptionEn: 'ROI: 12% of revenue (target: 20%)',
    },
  ],

  // Construction - Project profitability
  construction: [
    {
      id: 'project_margin',
      name: 'Marge projet',
      nameEn: 'Project Margin',
      value: 55,
      status: 'warning',
      description: 'ROI: 15% marge vs cible 22% = $125K manquant',
      descriptionEn: 'ROI: 15% margin vs 22% target = $125K gap',
    },
    {
      id: 'backlog_months',
      name: 'Carnet de commandes',
      nameEn: 'Backlog (Months)',
      value: 42,
      status: 'warning',
      description: 'ROI: 2.5 mois vs cible 6 mois',
      descriptionEn: 'ROI: 2.5 months vs 6 month target',
    },
    {
      id: 'billing_efficiency',
      name: 'Efficacité facturation',
      nameEn: 'Billing Efficiency',
      value: 78,
      status: 'good',
      description: 'ROI: $89K en retard de 60+ jours',
      descriptionEn: 'ROI: $89K past 60-day terms',
    },
    {
      id: 'cost_variance',
      name: 'Variance coûts',
      nameEn: 'Cost Variance',
      value: 45,
      status: 'critical',
      description: 'ROI: +45% dépassement matériaux = $28.5K',
      descriptionEn: 'ROI: +45% material overrun = $28.5K',
    },
    {
      id: 'equipment_util',
      name: 'Utilisation équipement',
      nameEn: 'Equipment Utilization',
      value: 72,
      status: 'good',
      description: 'ROI: 72% utilisé vs 30% industrie',
      descriptionEn: 'ROI: 72% utilized vs 30% industry avg',
    },
  ],

  // Professional Services - Utilization focused
  professional_services: [
    {
      id: 'utilization',
      name: 'Taux d\'utilisation',
      nameEn: 'Utilization Rate',
      value: 78,
      status: 'good',
      description: 'ROI: 78% facturable = potentiel 7% restant',
      descriptionEn: 'ROI: 78% billable = 7% potential left',
    },
    {
      id: 'realization',
      name: 'Taux de réalisation',
      nameEn: 'Realization Rate',
      value: 85,
      status: 'good',
      description: 'ROI: 85% des heures facturées payées',
      descriptionEn: 'ROI: 85% of billed hours collected',
    },
    {
      id: 'revenue_per_employee',
      name: 'Revenu/employé',
      nameEn: 'Revenue per Employee',
      value: 82,
      status: 'good',
      description: 'ROI: $185K/employé vs $165K moyenne',
      descriptionEn: 'ROI: $185K/employee vs $165K average',
    },
    {
      id: 'client_retention',
      name: 'Rétention clients',
      nameEn: 'Client Retention',
      value: 92,
      status: 'good',
      description: 'ROI: 92% rétention = $45K économisé/client',
      descriptionEn: 'ROI: 92% retention = $45K saved/client',
    },
    {
      id: 'avg_hourly_rate',
      name: 'Taux horaire effectif',
      nameEn: 'Effective Hourly Rate',
      value: 75,
      status: 'good',
      description: 'ROI: $142/h effectif vs $175 cible',
      descriptionEn: 'ROI: $142/hr effective vs $175 target',
    },
  ],

  // Manufacturing - Production efficiency
  manufacturing: [
    {
      id: 'oee',
      name: 'OEE (Efficacité équip.)',
      nameEn: 'OEE',
      value: 72,
      status: 'good',
      description: 'ROI: 72% efficacité = $85K capacité inutilisée',
      descriptionEn: 'ROI: 72% efficiency = $85K unused capacity',
    },
    {
      id: 'rejection_rate',
      name: 'Taux de rejet',
      nameEn: 'Rejection Rate',
      value: 65,
      status: 'warning',
      description: 'ROI: 5.2% rejeté = $32K perdu/mois',
      descriptionEn: 'ROI: 5.2% rejected = $32K lost/month',
    },
    {
      id: 'unit_cost',
      name: 'Coût unitaire',
      nameEn: 'Unit Cost',
      value: 78,
      status: 'good',
      description: 'ROI: $12.40/unité vs cible $11.50',
      descriptionEn: 'ROI: $12.40/unit vs $11.50 target',
    },
    {
      id: 'inventory_days',
      name: 'Jours inventaire',
      nameEn: 'Inventory Days',
      value: 68,
      status: 'warning',
      description: 'ROI: 45 jours = $125K cash immobilisé',
      descriptionEn: 'ROI: 45 days = $125K cash tied up',
    },
    {
      id: 'on_time_delivery',
      name: 'Livraison à temps',
      nameEn: 'On-Time Delivery',
      value: 88,
      status: 'good',
      description: 'ROI: 88% à temps = clients satisfaits',
      descriptionEn: 'ROI: 88% on-time = satisfied clients',
    },
  ],

  // Agriculture - Yield focused
  agriculture: [
    {
      id: 'yield_per_hectare',
      name: 'Rendement/hectare',
      nameEn: 'Yield per Hectare',
      value: 85,
      status: 'good',
      description: 'ROI: 4.2t/ha vs moyenne 3.8t (+10.5%)',
      descriptionEn: 'ROI: 4.2t/ha vs 3.8t average (+10.5%)',
    },
    {
      id: 'input_cost_ratio',
      name: 'Ratio coûts intrants',
      nameEn: 'Input Cost Ratio',
      value: 72,
      status: 'good',
      description: 'ROI: 28% des revenus en intrants',
      descriptionEn: 'ROI: 28% of revenue in inputs',
    },
    {
      id: 'equipment_efficiency',
      name: 'Efficacité équipement',
      nameEn: 'Equipment Efficiency',
      value: 68,
      status: 'warning',
      description: 'ROI: 68% utilisé en saison = potentiel',
      descriptionEn: 'ROI: 68% used in season = potential',
    },
    {
      id: 'gross_margin',
      name: 'Marge brute',
      nameEn: 'Gross Margin',
      value: 78,
      status: 'good',
      description: 'ROI: 35% marge brute sur production',
      descriptionEn: 'ROI: 35% gross margin on production',
    },
    {
      id: 'subsidy_capture',
      name: 'Subventions captées',
      nameEn: 'Subsidy Capture',
      value: 82,
      status: 'good',
      description: 'ROI: $42K subventions obtenues/an',
      descriptionEn: 'ROI: $42K subsidies captured/year',
    },
  ],

  // Healthcare - Patient revenue focused
  healthcare: [
    {
      id: 'revenue_per_patient',
      name: 'Revenu/patient',
      nameEn: 'Revenue per Patient',
      value: 82,
      status: 'good',
      description: 'ROI: $245/visite vs moyenne $210',
      descriptionEn: 'ROI: $245/visit vs $210 average',
    },
    {
      id: 'patient_volume',
      name: 'Volume patients',
      nameEn: 'Patient Volume',
      value: 75,
      status: 'good',
      description: 'ROI: 85% capacité utilisée',
      descriptionEn: 'ROI: 85% capacity utilized',
    },
    {
      id: 'collection_rate',
      name: 'Taux de recouvrement',
      nameEn: 'Collection Rate',
      value: 88,
      status: 'good',
      description: 'ROI: 88% collecté = $18K à récupérer',
      descriptionEn: 'ROI: 88% collected = $18K to recover',
    },
    {
      id: 'overhead_ratio',
      name: 'Ratio frais généraux',
      nameEn: 'Overhead Ratio',
      value: 65,
      status: 'warning',
      description: 'ROI: 42% en frais généraux (cible: 35%)',
      descriptionEn: 'ROI: 42% overhead (target: 35%)',
    },
    {
      id: 'equipment_roi',
      name: 'ROI équipement',
      nameEn: 'Equipment ROI',
      value: 72,
      status: 'good',
      description: 'ROI: 18 mois pour amortir équipements',
      descriptionEn: 'ROI: 18 months to payback equipment',
    },
  ],

  // Transport - Fleet efficiency
  transport: [
    {
      id: 'revenue_per_km',
      name: 'Revenu par km',
      nameEn: 'Revenue per KM',
      value: 78,
      status: 'good',
      description: 'ROI: $2.45/km vs coût $1.85 = 32% marge',
      descriptionEn: 'ROI: $2.45/km vs $1.85 cost = 32% margin',
    },
    {
      id: 'fleet_utilization',
      name: 'Utilisation flotte',
      nameEn: 'Fleet Utilization',
      value: 72,
      status: 'good',
      description: 'ROI: 72% en route = $85K capacité libre',
      descriptionEn: 'ROI: 72% on road = $85K idle capacity',
    },
    {
      id: 'fuel_efficiency',
      name: 'Efficacité carburant',
      nameEn: 'Fuel Efficiency',
      value: 82,
      status: 'good',
      description: 'ROI: 8.2L/100km = $12K économie/an',
      descriptionEn: 'ROI: 8.2L/100km = $12K savings/year',
    },
    {
      id: 'maintenance_cost',
      name: 'Coût entretien',
      nameEn: 'Maintenance Cost',
      value: 68,
      status: 'warning',
      description: 'ROI: $0.18/km vs cible $0.15',
      descriptionEn: 'ROI: $0.18/km vs $0.15 target',
    },
    {
      id: 'on_time_delivery',
      name: 'Livraison à temps',
      nameEn: 'On-Time Delivery',
      value: 92,
      status: 'good',
      description: 'ROI: 92% à temps = clients satisfaits',
      descriptionEn: 'ROI: 92% on-time = satisfied clients',
    },
  ],

  // Education - Student economics
  education: [
    {
      id: 'student_retention',
      name: 'Rétention étudiants',
      nameEn: 'Student Retention',
      value: 88,
      status: 'good',
      description: 'ROI: 88% reviennent = $85K/étudiant économisé',
      descriptionEn: 'ROI: 88% return = $85K/student saved',
    },
    {
      id: 'revenue_per_student',
      name: 'Revenu/étudiant',
      nameEn: 'Revenue per Student',
      value: 82,
      status: 'good',
      description: 'ROI: $12.5K/étudiant vs $11K moyenne',
      descriptionEn: 'ROI: $12.5K/student vs $11K average',
    },
    {
      id: 'class_fill_rate',
      name: 'Taux remplissage',
      nameEn: 'Class Fill Rate',
      value: 75,
      status: 'good',
      description: 'ROI: 75% capacité = 25% places disponibles',
      descriptionEn: 'ROI: 75% capacity = 25% seats available',
    },
    {
      id: 'cost_per_student',
      name: 'Coût/étudiant',
      nameEn: 'Cost per Student',
      value: 72,
      status: 'good',
      description: 'ROI: $8.2K/étudiant = 34% marge',
      descriptionEn: 'ROI: $8.2K/student = 34% margin',
    },
    {
      id: 'grant_utilization',
      name: 'Utilisation subventions',
      nameEn: 'Grant Utilization',
      value: 92,
      status: 'good',
      description: 'ROI: 92% des subventions utilisées',
      descriptionEn: 'ROI: 92% of grants utilized',
    },
  ],

  // Wholesale - Distribution efficiency
  wholesale: [
    {
      id: 'gross_margin',
      name: 'Marge brute',
      nameEn: 'Gross Margin',
      value: 72,
      status: 'good',
      description: 'ROI: 22% marge sur distribution',
      descriptionEn: 'ROI: 22% margin on distribution',
    },
    {
      id: 'inventory_turn',
      name: 'Rotation inventaire',
      nameEn: 'Inventory Turnover',
      value: 78,
      status: 'good',
      description: 'ROI: 8x/an = cash flow optimisé',
      descriptionEn: 'ROI: 8x/year = optimized cash flow',
    },
    {
      id: 'order_fill_rate',
      name: 'Taux commandes remplies',
      nameEn: 'Order Fill Rate',
      value: 92,
      status: 'good',
      description: 'ROI: 92% livrées complètes = clients satisfaits',
      descriptionEn: 'ROI: 92% complete = satisfied clients',
    },
    {
      id: 'warehouse_cost',
      name: 'Coût entreposage',
      nameEn: 'Warehouse Cost',
      value: 68,
      status: 'warning',
      description: 'ROI: $4.20/pi² vs cible $3.50',
      descriptionEn: 'ROI: $4.20/sqft vs $3.50 target',
    },
    {
      id: 'days_sales_outstanding',
      name: 'DSO (jours créances)',
      nameEn: 'Days Sales Outstanding',
      value: 65,
      status: 'warning',
      description: 'ROI: 45 jours = $185K en attente',
      descriptionEn: 'ROI: 45 days = $185K outstanding',
    },
  ],

  // Automotive - Sales and service mix
  automotive: [
    {
      id: 'service_revenue_pct',
      name: 'Revenus services %',
      nameEn: 'Service Revenue %',
      value: 72,
      status: 'good',
      description: 'ROI: 28% des revenus = marge élevée',
      descriptionEn: 'ROI: 28% of revenue = high margin',
    },
    {
      id: 'gross_margin_vehicles',
      name: 'Marge véhicules',
      nameEn: 'Vehicle Gross Margin',
      value: 65,
      status: 'warning',
      description: 'ROI: 8% marge véhicules vs 12% cible',
      descriptionEn: 'ROI: 8% vehicle margin vs 12% target',
    },
    {
      id: 'parts_margin',
      name: 'Marge pièces',
      nameEn: 'Parts Margin',
      value: 85,
      status: 'good',
      description: 'ROI: 45% marge sur pièces',
      descriptionEn: 'ROI: 45% margin on parts',
    },
    {
      id: 'labor_efficiency',
      name: 'Efficacité main-d\'œuvre',
      nameEn: 'Labor Efficiency',
      value: 78,
      status: 'good',
      description: 'ROI: 78% heures facturées vs disponibles',
      descriptionEn: 'ROI: 78% billed vs available hours',
    },
    {
      id: 'customer_retention',
      name: 'Rétention clients',
      nameEn: 'Customer Retention',
      value: 72,
      status: 'good',
      description: 'ROI: 72% reviennent pour service',
      descriptionEn: 'ROI: 72% return for service',
    },
  ],

  // Beauty & Wellness - Client value
  beauty_wellness: [
    {
      id: 'revenue_per_client',
      name: 'Revenu/client',
      nameEn: 'Revenue per Client',
      value: 78,
      status: 'good',
      description: 'ROI: $125/visite vs $95 moyenne',
      descriptionEn: 'ROI: $125/visit vs $95 average',
    },
    {
      id: 'rebooking_rate',
      name: 'Taux de rebooking',
      nameEn: 'Rebooking Rate',
      value: 72,
      status: 'good',
      description: 'ROI: 72% rebook = valeur client élevée',
      descriptionEn: 'ROI: 72% rebook = high client value',
    },
    {
      id: 'retail_attachment',
      name: 'Ventes produits',
      nameEn: 'Retail Attachment',
      value: 45,
      status: 'warning',
      description: 'ROI: 15% ajoutent produits (cible: 25%)',
      descriptionEn: 'ROI: 15% add products (target: 25%)',
    },
    {
      id: 'chair_utilization',
      name: 'Utilisation postes',
      nameEn: 'Chair Utilization',
      value: 68,
      status: 'warning',
      description: 'ROI: 68% occupé = potentiel 32%',
      descriptionEn: 'ROI: 68% occupied = 32% potential',
    },
    {
      id: 'staff_productivity',
      name: 'Productivité staff',
      nameEn: 'Staff Productivity',
      value: 82,
      status: 'good',
      description: 'ROI: $485/jour/employé généré',
      descriptionEn: 'ROI: $485/day/employee generated',
    },
  ],
};

// Get metrics for specific industry or fallback to real estate
const getDefaultMetrics = (isEn: boolean, industryId?: string): HealthMetric[] => {
  const industry = industryId?.toLowerCase() || 'real_estate';
  return INDUSTRY_METRICS[industry] || INDUSTRY_METRICS.real_estate;
};

export default function HealthScoreGauge({
  score,
  criticalCount,
  warningCount,
  infoCount,
  size = 'md',
  previousScore,
  isEn = false,
  onClick,
  metrics,
  topRisks,
  anomalies,
  industry,
  showIndustryMetrics = false,
}: HealthScoreGaugeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  // Use provided metrics or defaults based on industry (only if showIndustryMetrics is true)
  const displayMetrics = showIndustryMetrics 
    ? (metrics || getDefaultMetrics(isEn, industry?.id))
    : (metrics || []);

  // Calculate an adjusted score if score is 0 but we have metrics
  const adjustedScore = useMemo(() => {
    if (score > 0) return score;
    // If score is 0, calculate from metrics
    if (displayMetrics.length > 0) {
      const avgScore = displayMetrics.length > 0 
        ? displayMetrics.reduce((acc, m) => acc + (m.value ?? 0), 0) / displayMetrics.length 
        : 0;
      return Math.round(avgScore);
    }
    return score;
  }, [score, displayMetrics]);

  const { color, label, labelEn, icon, bgColor } = useMemo(() => {
    if (adjustedScore >= 80) {
      // Excellent - Bright Green
      return {
        color: 'rgb(var(--color-success))',
        bgColor: 'rgb(var(--color-success) / 0.1)',
        label: 'Excellent',
        labelEn: 'Excellent',
        icon: CheckCircle,
      };
    } else if (adjustedScore >= 60) {
      // Good - Green (not gray)
      return {
        color: 'rgb(34, 197, 94)', // green-500
        bgColor: 'rgb(34, 197, 94, 0.1)',
        label: 'Bon',
        labelEn: 'Good',
        icon: Shield,
      };
    } else if (adjustedScore >= 40) {
      // Warning - Orange/Yellow
      return {
        color: 'rgb(var(--color-warning))',
        bgColor: 'rgb(var(--color-warning) / 0.1)',
        label: 'Attention requise',
        labelEn: 'Attention Required',
        icon: AlertTriangle,
      };
    } else {
      // Critical - Red
      return {
        color: 'rgb(var(--color-error))',
        bgColor: 'rgb(var(--color-error) / 0.1)',
        label: 'Critique',
        labelEn: 'Critical',
        icon: XCircle,
      };
    }
  }, [adjustedScore]);

  const Icon = icon;
  const scoreChange = previousScore ? adjustedScore - previousScore : null;

  // Responsive gauge sizes
  const sizes = {
    sm: { gauge: 90, gaugeSm: 80, stroke: 8, fontSize: 'text-xl sm:text-2xl', iconSize: 14 },
    md: { gauge: 140, gaugeSm: 110, stroke: 10, fontSize: 'text-3xl sm:text-4xl', iconSize: 18 },
    lg: { gauge: 180, gaugeSm: 140, stroke: 12, fontSize: 'text-4xl sm:text-5xl', iconSize: 22 },
  };

  const { gauge, gaugeSm, stroke, fontSize, iconSize } = sizes[size];
  const radius = (gauge - stroke) / 2;
  const radiusSm = (gaugeSm - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const circumferenceSm = 2 * Math.PI * radiusSm;
  const progress = ((100 - adjustedScore) / 100) * circumference;
  const progressSm = ((100 - adjustedScore) / 100) * circumferenceSm;

  const segments = [
    { id: 'critical', count: criticalCount, color: 'rgb(var(--color-error))', label: isEn ? 'Critical issues' : 'Critiques', labelFull: isEn ? 'Critical issues' : 'Problèmes critiques' },
    { id: 'warning', count: warningCount, color: 'rgb(var(--color-warning))', label: isEn ? 'Warnings' : 'Avertissements', labelFull: isEn ? 'Warnings' : 'Avertissements' },
    { id: 'info', count: infoCount, color: 'rgb(var(--color-info))', label: 'Info', labelFull: isEn ? 'Information' : 'Informations' },
  ];

  return (
    <div 
      className={`
        card relative overflow-hidden transition-all duration-300 cursor-pointer
        ${isHovered ? 'shadow-xl ring-2 ring-primary/20 scale-[1.005]' : 'shadow-md'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setHoveredSegment(null); }}
      onClick={onClick}
    >
      {/* Animated gradient background on hover */}
      <div 
        className="absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none"
        style={{ 
          opacity: isHovered ? 0.05 : 0,
          background: `radial-gradient(circle at center, ${color}, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        {/* Header with title and industry badge */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h3 className="text-sm sm:text-lg font-semibold text-primary">
              {isEn ? 'Financial Health Score' : 'Score de santé financière'}
            </h3>
            {industry && (
              <div 
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                  color: 'rgb(var(--color-primary-600))',
                }}
                title={isEn ? 'Industry-specific benchmarks applied. More industries available.' : 'Benchmarks spécifiques à l\'industrie appliqués. Plus d\'industries disponibles.'}
              >
                <Building2 className="w-3 h-3" />
                <span>{isEn ? industry.nameEn : industry.name}</span>
              </div>
            )}
          </div>
          <div 
            className={`
              p-1.5 sm:p-2 rounded-lg transition-all duration-300
              ${isHovered ? 'scale-110 rotate-12' : ''}
            `}
            style={{ backgroundColor: bgColor }}
          >
            <Icon style={{ color, width: iconSize, height: iconSize }} className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Main content grid - responsive two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Left side: Gauge and summary */}
          <div>
            <div className="flex items-center gap-3 sm:gap-6">
              {/* Gauge - Responsive */}
              <div 
                className={`relative transition-transform duration-300 flex-shrink-0 ${isHovered ? 'scale-105' : ''}`} 
              >
                {/* Mobile gauge */}
                <svg 
                  viewBox={`0 0 ${gaugeSm} ${gaugeSm}`}
                  className="transform -rotate-90 sm:hidden"
                  style={{ width: gaugeSm, height: gaugeSm }}
                >
                  <circle
                    cx={gaugeSm / 2}
                    cy={gaugeSm / 2}
                    r={radiusSm}
                    fill="none"
                    stroke="rgb(var(--color-bg-emphasis))"
                    strokeWidth={stroke - 2}
                    className={isHovered ? 'animate-pulse' : ''}
                    style={{ opacity: isHovered ? 0.7 : 1 }}
                  />
                  <circle
                    cx={gaugeSm / 2}
                    cy={gaugeSm / 2}
                    r={radiusSm}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke - 2}
                    strokeLinecap="round"
                    strokeDasharray={circumferenceSm}
                    strokeDashoffset={progressSm}
                    style={{ 
                      transition: 'stroke-dashoffset 1s ease-in-out, filter 0.3s',
                      filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none',
                    }}
                  />
                </svg>
                
                {/* Desktop gauge */}
                <svg 
                  viewBox={`0 0 ${gauge} ${gauge}`}
                  className="transform -rotate-90 hidden sm:block"
                  style={{ width: gauge, height: gauge }}
                >
                  <circle
                    cx={gauge / 2}
                    cy={gauge / 2}
                    r={radius}
                    fill="none"
                    stroke="rgb(var(--color-bg-emphasis))"
                    strokeWidth={stroke}
                    className={isHovered ? 'animate-pulse' : ''}
                    style={{ opacity: isHovered ? 0.7 : 1 }}
                  />
                  <circle
                    cx={gauge / 2}
                    cy={gauge / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={progress}
                    style={{ 
                      transition: 'stroke-dashoffset 1s ease-in-out, filter 0.3s',
                      filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none',
                    }}
                  />
                </svg>
                
                {/* Score text - Centered over gauge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span 
                    className={`${fontSize} font-bold tabular-nums transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}
                    style={{ color }}
                  >
                    {adjustedScore}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted">/ 100</span>
                  
                  {/* Score change indicator */}
                  {scoreChange !== null && (
                    <div 
                      className={`
                        flex items-center gap-0.5 text-[10px] sm:text-xs mt-1 transition-all duration-300
                        ${scoreChange >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}
                        ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
                      `}
                    >
                      <TrendingUp className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${scoreChange < 0 ? 'rotate-180' : ''}`} />
                      <span>{scoreChange >= 0 ? '+' : ''}{scoreChange}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                <div 
                  className={`
                    text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-full inline-flex items-center gap-1.5 sm:gap-2
                    transition-all duration-300
                    ${isHovered ? 'scale-105 shadow-md' : ''}
                  `}
                  style={{ backgroundColor: bgColor, color }}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <LabelTooltip label={isEn ? labelEn : label}>
                    <span className="truncate">{isEn ? labelEn : label}</span>
                  </LabelTooltip>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  {segments.map((segment) => segment.count > 0 && (
                    <div 
                      key={segment.id}
                      className={`
                        flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg transition-all duration-200 cursor-pointer
                        ${hoveredSegment === segment.id ? 'bg-muted scale-[1.02]' : 'hover:bg-muted/50'}
                      `}
                      onMouseEnter={() => setHoveredSegment(segment.id)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      title={segment.labelFull}
                    >
                      <span 
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse flex-shrink-0"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-xs sm:text-sm truncate" style={{ color: segment.color }}>
                        <span className="font-medium">{segment.count}</span> <span className="hidden xs:inline">{segment.label}</span>
                      </span>
                      {hoveredSegment === segment.id && (
                        <Info className="w-3 h-3 ml-auto flex-shrink-0 hidden sm:block" style={{ color: segment.color }} />
                      )}
                    </div>
                  ))}
                  
                  {criticalCount === 0 && warningCount === 0 && infoCount === 0 && (
                    <div 
                      className={`
                        flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg transition-all duration-200
                        ${isHovered ? 'bg-green-50 dark:bg-green-900/20' : ''}
                      `}
                    >
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-success truncate">
                        {isEn ? 'No anomalies' : 'Aucune anomalie'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Metrics Breakdown */}
            {displayMetrics.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Key Metrics' : 'Métriques clés'}
                  </h4>
                </div>
                <div className="space-y-2.5">
                  {displayMetrics.map((metric) => (
                    <div
                      key={metric.id}
                      className={`
                        relative group/metric cursor-pointer rounded-lg transition-all duration-200
                        ${hoveredMetric === metric.id ? 'bg-muted' : 'hover:bg-muted/50'}
                      `}
                      onMouseEnter={() => setHoveredMetric(metric.id)}
                      onMouseLeave={() => setHoveredMetric(null)}
                    >
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                metric.status === 'good'
                                  ? 'rgb(var(--color-success))'
                                  : metric.status === 'warning'
                                  ? 'rgb(var(--color-warning))'
                                  : 'rgb(var(--color-error))',
                            }}
                          />
                          <LabelTooltip label={isEn ? metric.nameEn : metric.name}>
                            <span className="text-xs font-medium truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                              {isEn ? metric.nameEn : metric.name}
                            </span>
                          </LabelTooltip>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{
                              color:
                                metric.status === 'good'
                                  ? 'rgb(var(--color-success))'
                                  : metric.status === 'warning'
                                  ? 'rgb(var(--color-warning))'
                                  : 'rgb(var(--color-error))',
                            }}
                          >
                            {metric.value}%
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="px-2 pb-1.5">
                        <div 
                          className="h-1 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'rgb(var(--color-bg-emphasis))' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${metric.value}%`,
                              backgroundColor:
                                metric.status === 'good'
                                  ? 'rgb(var(--color-success))'
                                  : metric.status === 'warning'
                                  ? 'rgb(var(--color-warning))'
                                  : 'rgb(var(--color-error))',
                            }}
                          />
                        </div>
                      </div>
                      {/* Tooltip on hover */}
                      {hoveredMetric === metric.id && (metric.description || metric.descriptionEn) && (
                        <div 
                          className="absolute left-0 right-0 -bottom-8 z-10 px-2 py-1 text-[10px] text-center rounded shadow-lg"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-surface))',
                            color: 'rgb(var(--color-text-muted))',
                            border: '1px solid rgb(var(--color-border))',
                          }}
                        >
                          {isEn ? metric.descriptionEn : metric.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right side: Top Risks */}
          <div className="lg:border-l lg:pl-6 flex flex-col" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {/* Header with title and badges - responsive layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h4 className="text-sm font-semibold whitespace-nowrap" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Top Risks' : 'Risques principaux'}
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {criticalCount > 0 && (
                  <span 
                    className="inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-error) / 0.1)',
                      color: 'rgb(var(--color-error))'
                    }}
                  >
                    {criticalCount} {isEn ? 'critical' : 'critiques'}
                  </span>
                )}
                {warningCount > 0 && (
                  <span 
                    className="inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                      color: 'rgb(var(--color-warning))'
                    }}
                  >
                    {warningCount} {isEn ? 'warnings' : 'avertissements'}
                  </span>
                )}
              </div>
            </div>
            
            {(() => {
              // Get critical and warning anomalies to display
              const criticalAnomalies = anomalies?.filter(a => a.severity === 'critical').slice(0, 3) || [];
              const warningAnomalies = anomalies?.filter(a => a.severity === 'warning').slice(0, Math.max(0, 3 - criticalAnomalies.length)) || [];
              const displayAnomalies = [...criticalAnomalies, ...warningAnomalies];
              
              // Also consider topRisks as fallback
              const hasRisksToShow = displayAnomalies.length > 0 || (topRisks && topRisks.length > 0);
              
              if (hasRisksToShow) {
                return (
                  <div className="flex flex-col h-full">
                    {/* Risk cards - scrollable on mobile if needed, full height on desktop */}
                    <div className="space-y-2.5 sm:space-y-3 flex-1 overflow-y-auto max-h-[280px] lg:max-h-none pr-1">
                      {displayAnomalies.length > 0 ? (
                        displayAnomalies.map((anomaly, idx) => (
                          <div 
                            key={anomaly.id}
                            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all hover:shadow-sm"
                            style={{ 
                              borderColor: anomaly.severity === 'critical' 
                                ? 'rgb(var(--color-error) / 0.3)' 
                                : 'rgb(var(--color-warning) / 0.3)',
                              backgroundColor: anomaly.severity === 'critical'
                                ? 'rgb(var(--color-error) / 0.03)'
                                : 'rgb(var(--color-warning) / 0.03)',
                            }}
                          >
                            {/* Number badge */}
                            <div 
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ 
                                backgroundColor: anomaly.severity === 'critical' 
                                  ? 'rgb(var(--color-error) / 0.15)' 
                                  : 'rgb(var(--color-warning) / 0.15)',
                              }}
                            >
                              <span 
                                className="text-[10px] sm:text-xs font-bold"
                                style={{ 
                                  color: anomaly.severity === 'critical' 
                                    ? 'rgb(var(--color-error))' 
                                    : 'rgb(var(--color-warning))' 
                                }}
                              >
                                {idx + 1}
                              </span>
                            </div>
                            {/* Content - fully visible, no truncation */}
                            <div className="min-w-0 flex-1">
                              <p 
                                className="font-semibold text-xs sm:text-sm leading-snug break-words"
                                style={{ 
                                  color: anomaly.severity === 'critical' 
                                    ? 'rgb(var(--color-error))' 
                                    : 'rgb(var(--color-warning))' 
                                }}
                              >
                                {anomaly.title}
                              </p>
                              {anomaly.description && (
                                <p 
                                  className="text-[11px] sm:text-xs mt-1 leading-relaxed break-words"
                                  style={{ color: 'rgb(var(--color-text-muted))' }}
                                >
                                  {anomaly.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        topRisks?.slice(0, 3).map((risk, idx) => (
                          <div 
                            key={idx}
                            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all hover:shadow-sm"
                            style={{ 
                              borderColor: idx < 2 ? 'rgb(var(--color-error) / 0.3)' : 'rgb(var(--color-warning) / 0.3)',
                              backgroundColor: idx < 2 ? 'rgb(var(--color-error) / 0.03)' : 'rgb(var(--color-warning) / 0.03)',
                            }}
                          >
                            <div 
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ 
                                backgroundColor: idx < 2 ? 'rgb(var(--color-error) / 0.15)' : 'rgb(var(--color-warning) / 0.15)',
                              }}
                            >
                              <span 
                                className="text-[10px] sm:text-xs font-bold"
                                style={{ color: idx < 2 ? 'rgb(var(--color-error))' : 'rgb(var(--color-warning))' }}
                              >
                                {idx + 1}
                              </span>
                            </div>
                            <p 
                              className="text-xs sm:text-sm leading-relaxed break-words"
                              style={{ color: 'rgb(var(--color-text-secondary))' }}
                            >
                              {risk}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Scroll to anomalies button */}
                    <button
                      onClick={onClick}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:scale-[1.01] hover:shadow-sm border"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-primary-500) / 0.08)',
                        borderColor: 'rgb(var(--color-primary-500) / 0.2)',
                        color: 'rgb(var(--color-primary-600))',
                      }}
                    >
                      <span>{isEn ? 'View all anomalies' : 'Voir toutes les anomalies'}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                );
              } else if (criticalCount > 0 || warningCount > 0) {
                return (
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[8rem] lg:min-h-[10rem]">
                    <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 mb-2" style={{ color: 'rgb(var(--color-warning))' }} />
                    <p className="text-xs sm:text-sm font-medium text-center" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn 
                        ? `${criticalCount + warningCount} issue${criticalCount + warningCount > 1 ? 's' : ''} found`
                        : `${criticalCount + warningCount} problème${criticalCount + warningCount > 1 ? 's' : ''} trouvé${criticalCount + warningCount > 1 ? 's' : ''}`
                      }
                    </p>
                    <button
                      onClick={onClick}
                      className="mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all hover:scale-[1.02] border"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-primary-500) / 0.08)',
                        borderColor: 'rgb(var(--color-primary-500) / 0.2)',
                        color: 'rgb(var(--color-primary-600))',
                      }}
                    >
                      <span>{isEn ? 'View details' : 'Voir les détails'}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                );
              } else {
                return (
                  <div className="flex-1 flex items-center justify-center min-h-[8rem] lg:min-h-[10rem]">
                    <div className="text-center">
                      <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2" style={{ color: 'rgb(var(--color-success))' }} />
                      <p className="text-xs sm:text-sm font-medium" style={{ color: 'rgb(var(--color-success))' }}>
                        {isEn ? 'No critical risks' : 'Aucun risque critique'}
                      </p>
                      <p className="text-[10px] sm:text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'Your financial data looks healthy' : 'Vos données financières sont saines'}
                      </p>
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
