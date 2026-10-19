import { AlertTriangle, BarChart3 } from 'lucide-react';
import type { ChartDataIssue } from '../../lib/chartDataValidation';

export function ChartDataState({
  title,
  issue,
  isEn = false,
}: {
  title: string;
  issue: Exclude<ChartDataIssue, null>;
  isEn?: boolean;
}) {
  const Icon = issue === 'invalid' ? AlertTriangle : BarChart3;
  return (
    <section className="card p-4 sm:p-6" aria-label={title} data-chart-state={issue}>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center" role={issue === 'invalid' ? 'alert' : 'status'}>
        <Icon className="h-6 w-6 text-muted" aria-hidden="true" />
        <p className="text-sm text-muted">
          {issue === 'invalid'
            ? (isEn ? 'Unable to display this chart. Check the source data for invalid or missing values.' : 'Impossible d’afficher ce graphique. Vérifiez les valeurs invalides ou manquantes dans les données sources.')
            : (isEn ? 'No data available for this chart.' : 'Aucune donnée disponible pour ce graphique.')}
        </p>
      </div>
    </section>
  );
}
