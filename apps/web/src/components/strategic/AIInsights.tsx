/**
 * AI Insights Component
 * 
 * Provides AI-powered insights and suggestions for financial modeling
 */

import { useMemo } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target } from 'lucide-react';
import { type Driver } from '../../lib/financialModel';

interface Insight {
  type: 'warning' | 'suggestion' | 'opportunity' | 'risk';
  title: string;
  message: string;
  action?: string;
}

interface AIInsightsProps {
  driver: Driver;
  value: number | null;
  periodKey: string;
  allDrivers: Record<string, Driver>;
  isEn: boolean;
}

export default function AIInsights({ driver, value, periodKey, allDrivers, isEn }: AIInsightsProps) {
  const insights = useMemo(() => {
    const insights: Insight[] = [];
    
    if (!value || value === null) return insights;
    
    // Check for negative cash flow
    if (driver.name.toLowerCase().includes('cash') && value < 0) {
      insights.push({
        type: 'warning',
        title: isEn ? 'Negative Cash Balance' : 'Solde négatif',
        message: isEn 
          ? 'Cash balance is negative. Consider raising capital or reducing expenses.'
          : 'Le solde est négatif. Envisagez de lever des fonds ou de réduire les dépenses.',
      });
    }
    
    // Check for high burn rate
    if (driver.name.toLowerCase().includes('burn') && value > 0) {
      const cashDriver = Object.values(allDrivers).find(d => 
        d.name.toLowerCase().includes('cash')
      );
      if (cashDriver) {
        const cashValue = cashDriver?.values?.[periodKey];
        if (cashValue && cashValue > 0 && value !== 0) {
          const months = cashValue / value;
          if (months < 6) {
            insights.push({
              type: 'risk',
              title: isEn ? 'Low Runway' : 'Piste faible',
              message: isEn
                ? `Only ${months.toFixed(1)} months of runway remaining. Consider fundraising.`
                : `Seulement ${months.toFixed(1)} mois de piste restants. Envisagez une levée de fonds.`,
            });
          }
        }
      }
    }
    
    // Growth opportunity detection
    if (driver.name.toLowerCase().includes('revenue') && value > 0) {
      insights.push({
        type: 'opportunity',
        title: isEn ? 'Growth Opportunity' : 'Opportunité de croissance',
        message: isEn
          ? 'Revenue is positive. Consider scaling marketing or sales efforts.'
          : 'Les revenus sont positifs. Envisagez d\'augmenter le marketing ou les ventes.',
      });
    }
    
    return insights;
  }, [driver, value, periodKey, allDrivers, isEn]);

  if (insights.length === 0) return null;

  const colors = {
    warning: { bg: '#FEF3C7', text: '#92400E', icon: AlertTriangle },
    risk: { bg: '#FEE2E2', text: '#991B1B', icon: TrendingDown },
    opportunity: { bg: '#D1FAE5', text: '#065F46', icon: TrendingUp },
    suggestion: { bg: '#DBEAFE', text: '#1E40AF', icon: Lightbulb },
  };

  return (
    <div className="absolute left-full top-0 ml-2 z-50 w-64">
      {insights.map((insight, index) => {
        const colorScheme = colors[insight.type];
        const Icon = colorScheme.icon;
        
        return (
          <div
            key={index}
            className="mb-2 p-3 rounded-lg border shadow-sm"
            style={{
              backgroundColor: colorScheme.bg,
              borderColor: colorScheme.text + '40',
            }}
          >
            <div className="flex items-start gap-2">
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colorScheme.text }} />
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1" style={{ color: colorScheme.text }}>
                  {insight.title}
                </div>
                <div className="text-xs" style={{ color: colorScheme.text, opacity: 0.9 }}>
                  {insight.message}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
