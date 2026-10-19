import { useState } from 'react';
import type { ChartConfig, DataMetric } from '../../lib/chartFavorites';
import { CHART_TYPE_INFO, METRIC_INFO } from '../../lib/chartFavorites';
import type { PreviewRow } from '../../lib/chartPreviewData';
import { chartExtent, getChartDataIssue, isChartLabel, isFiniteNumber } from '../../lib/chartDataValidation';
import { ChartDataState } from './ChartDataState';
import Sparkline from './Sparkline';

export interface PreviewField { id: DataMetric; color?: string }
const PAGE_SIZE = 60;

/** Financial values are shared across renderers; each chart declares its data requirements. */
export function FinancialChartPreview({ rows, fields, config = {}, isEn = true, currency = 'CAD' }: {
  rows: PreviewRow[]; fields: PreviewField[]; config?: Partial<ChartConfig>; isEn?: boolean; currency?: string;
}) {
  const [page, setPage] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const type = config.chartType || 'line';
  const title = isEn ? CHART_TYPE_INFO[type]?.labelEn || 'Chart' : CHART_TYPE_INFO[type]?.label || 'Graphique';
  const invalidFields = !Array.isArray(fields) || fields.some(field => !field || !Object.prototype.hasOwnProperty.call(METRIC_INFO, field.id)) || new Set(fields.map(field => field.id)).size !== fields.length;
  if (invalidFields || typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) return <ChartDataState title={title} issue="invalid" isEn={isEn} />;
  const periods = new Set<string>();
  const issue = getChartDataIssue(rows, row => {
    if (!isChartLabel(row.period) || periods.has(row.period) || !row.values || !fields.every(field => isFiniteNumber(row.values[field.id]))) return false;
    periods.add(row.period);
    return true;
  });
  if (issue || fields.length === 0) return <ChartDataState title={title} issue={issue || 'empty'} isEn={isEn} />;
  const unavailable = (message: string) => <div role="status" data-chart-state="unavailable" className="flex min-h-44 items-center justify-center rounded-lg border p-5 text-center text-sm">{message}</div>;
  if (['gantt', 'runway', 'scenario', 'burnRate', 'cashForecast'].includes(type)) return unavailable(isEn
    ? 'This chart requires planning assumptions. Open Strategic Planning to choose the plan, cash balance, and forecast horizon.'
    : 'Ce graphique nécessite des hypothèses. Ouvrez la planification stratégique pour choisir le plan, la trésorerie et l’horizon.');
  const units = new Set(fields.map(field => METRIC_INFO[field.id].unit));
  if (units.size > 1 && type !== 'table' && type !== 'sparkline') return unavailable(isEn ? 'Choose metrics with the same unit, or use a table.' : 'Choisissez des métriques de même unité ou un tableau.');
  const paged = ['bar', 'heatmap', 'table', 'waterfall', 'scatter'].includes(type);
  const safePage = Math.min(page, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1));
  const data = paged ? rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE) : rows;
  const last = rows[rows.length - 1];
  const fieldLabel = (field: PreviewField) => METRIC_INFO[field.id][isEn ? 'labelEn' : 'label'];
  const color = (field: PreviewField) => field.color || METRIC_INFO[field.id].color;
  const format = (value: number, field = fields[0], compact = false) => {
    const unit = METRIC_INFO[field.id].unit;
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      ...(unit === 'currency' ? { style: 'currency', currency } : {}),
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: unit === 'currency' && !compact ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value) + (unit === 'percentage' ? '%' : unit === 'days' ? (isEn ? ' days' : ' jours') : '');
  };
  const values = data.flatMap(row => fields.map(field => row.values[field.id]));
  if (config.stacked && type === 'bar') {
    for (const row of data) {
      values.push(fields.reduce((sum, field) => sum + Math.max(0, row.values[field.id]), 0));
      values.push(fields.reduce((sum, field) => sum + Math.min(0, row.values[field.id]), 0));
    }
  }
  const extent = chartExtent(values, true);
  const min = extent.min, max = extent.max === extent.min ? extent.max + 1 : extent.max;
  if (![min, max, max - min].every(Number.isFinite)) return <ChartDataState title={title} issue="invalid" isEn={isEn} />;
  const range = max - min || 1;
  const width = 560, height = 250, left = 65, right = 15, top = 15, bottom = 40;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const x = (index: number, length = data.length) => left + (length === 1 ? 0.5 : index / (length - 1)) * plotWidth;
  const y = (value: number) => top + (max - value) / range * plotHeight;
  const rowTitle = (row: PreviewRow) => `${row.period}: ${fields.map(field => `${fieldLabel(field)} ${format(row.values[field.id], field)}`).join('; ')}`;
  const everyLabel = Math.max(1, Math.ceil((data.length - 1) / 6));
  const markerStep = Math.max(1, Math.ceil((data.length - 1) / 150));
  const axes = <>
    {[0, .25, .5, .75, 1].map(fraction => <g key={fraction}>
      {config.showGrid !== false && <line x1={left} x2={width - right} y1={top + plotHeight * fraction} y2={top + plotHeight * fraction} stroke="currentColor" opacity=".12" />}
      <text x={left - 7} y={top + plotHeight * fraction + 3} textAnchor="end" fontSize="9" fill="currentColor">{format(max - range * fraction, fields[0], true)}</text>
    </g>)}
    <line x1={left} x2={width - right} y1={y(0)} y2={y(0)} stroke="currentColor" opacity=".35" />
    {type !== 'scatter' && data.map((row, index) => index % everyLabel === 0 || index === data.length - 1 ? <text key={row.period} x={type === 'bar' || type === 'waterfall' ? left + (index + .5) * plotWidth / data.length : x(index)} y={height - 13} textAnchor="middle" fontSize="9" fill="currentColor">{row.period}</text> : null)}
  </>;
  const svg = (children: React.ReactNode) => <svg role="img" aria-label={title} viewBox={`0 0 ${width} ${height}`} className="h-full min-h-44 w-full">{children}</svg>;
  let chart: React.ReactNode;

  if (type === 'line' || type === 'area') {
    chart = <svg role="img" aria-label={title} viewBox={`0 0 ${width} ${height}`} className="h-full min-h-44 w-full"
      onMouseMove={event => { const rect = event.currentTarget.getBoundingClientRect(); if (rect.width > 0) setHoveredIndex(Math.max(0, Math.min(data.length - 1, Math.round((((event.clientX - rect.left) / rect.width * width) - left) / plotWidth * (data.length - 1))))); }}
      onMouseLeave={() => setHoveredIndex(null)}>{axes}{fields.map(field => {
        const points = data.map((row, index) => `${x(index)},${y(row.values[field.id])}`);
        const path = `M${points.join(' L')}`;
        return <g key={field.id}>{type === 'area' && <path d={`${path} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={color(field)} opacity=".12" />}
          <path data-series={field.id} d={path} fill="none" stroke={color(field)} strokeWidth="2" />
          {data.map((row, index) => index % markerStep === 0 || index === data.length - 1 ? <circle key={row.period} cx={x(index)} cy={y(row.values[field.id])} r="3" fill={color(field)}><title>{rowTitle(row)}</title></circle> : null)}
        </g>;
      })}</svg>;
  } else if (type === 'bar') {
    const step = plotWidth / data.length;
    chart = svg(<>{axes}{data.map((row, index) => {
      let positive = 0, negative = 0;
      return <g key={row.period}>{fields.map((field, fieldIndex) => {
        const value = row.values[field.id];
        const start = config.stacked ? value >= 0 ? positive : negative : 0;
        if (value >= 0) positive += value; else negative += value;
        const end = start + value;
        const barWidth = step * .72 / (config.stacked ? 1 : fields.length);
        return <rect key={field.id} x={left + index * step + step * .14 + (config.stacked ? 0 : fieldIndex * barWidth)} y={Math.min(y(start), y(end))}
          width={barWidth * .9} height={Math.abs(y(start) - y(end))} fill={color(field)}><title>{rowTitle(row)}</title></rect>;
      })}</g>;
    })}</>);
  } else if (type === 'pie' || type === 'donut' || type === 'treemap') {
    const segments = fields.map(field => ({ field, value: last.values[field.id] }));
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    if (!Number.isFinite(total)) return <ChartDataState title={title} issue="invalid" isEn={isEn} />;
    if (total <= 0 || segments.some(segment => segment.value < 0)) return unavailable(isEn ? 'Proportions require nonnegative values and a total greater than zero. Use a bar or line chart for these values.' : 'Les proportions exigent des valeurs positives ou nulles et un total supérieur à zéro. Utilisez des barres ou des lignes.');
    let offset = 0;
    chart = <div className="space-y-3"><p className="text-center text-xs">{last.period}</p>{type === 'treemap' ? <div role="img" aria-label={title} className="flex h-44 w-full overflow-hidden rounded-lg">{segments.filter(segment => segment.value > 0).map(segment => <div key={segment.field.id} className="flex min-w-0 items-center justify-center overflow-hidden px-1 text-center text-xs text-white" style={{ width: `${segment.value / total * 100}%`, backgroundColor: color(segment.field) }} title={`${fieldLabel(segment.field)}: ${format(segment.value, segment.field)}`}><span className="truncate">{fieldLabel(segment.field)}</span></div>)}</div>
      : <svg role="img" aria-label={title} viewBox="0 0 200 200" className="mx-auto h-44 w-44">{segments.filter(segment => segment.value > 0).map(segment => {
        const fraction = segment.value / total;
        const start = offset * 2 * Math.PI - Math.PI / 2; offset += fraction;
        const end = offset * 2 * Math.PI - Math.PI / 2;
        return fraction >= 1 - Number.EPSILON ? <circle key={segment.field.id} cx="100" cy="100" r="85" fill={color(segment.field)}><title>{format(segment.value, segment.field)}</title></circle>
          : <path key={segment.field.id} d={`M100,100 L${100 + 85 * Math.cos(start)},${100 + 85 * Math.sin(start)} A85,85 0 ${fraction > .5 ? 1 : 0} 1 ${100 + 85 * Math.cos(end)},${100 + 85 * Math.sin(end)} Z`} fill={color(segment.field)}><title>{`${fieldLabel(segment.field)}: ${format(segment.value, segment.field)}`}</title></path>;
      })}{type === 'donut' && <circle cx="100" cy="100" r="50" fill="rgb(var(--color-surface))" />}</svg>}
      <dl className="flex flex-wrap justify-center gap-3 text-xs">{segments.map(segment => <div key={segment.field.id}><dt>{fieldLabel(segment.field)}</dt><dd>{format(segment.value, segment.field)} · {(segment.value / total * 100).toFixed(1)}%</dd></div>)}</dl></div>;
  } else if (type === 'gauge') {
    const value = last.values[fields[0].id];
    if (fields.length !== 1 || METRIC_INFO[fields[0].id].unit !== 'percentage' || value < 0 || value > 100) return unavailable(isEn ? 'A gauge requires one percentage metric between 0% and 100%.' : 'Une jauge nécessite une métrique en pourcentage entre 0% et 100%.');
    chart = <div className="text-center"><svg role="img" aria-label={title} viewBox="0 0 200 120" className="mx-auto h-40 w-60"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="currentColor" opacity=".15" strokeWidth="14" /><path d="M20 100 A80 80 0 0 1 180 100" pathLength="100" fill="none" stroke={color(fields[0])} strokeWidth="14" strokeDasharray={`${value} 100`} /></svg><p>{fieldLabel(fields[0])}: {format(value)}</p><p className="text-xs">{last.period}</p></div>;
  } else if (type === 'radar') {
    if (fields.length < 3 || fields.some(field => last.values[field.id] < 0)) return unavailable(isEn ? 'A radar requires at least three nonnegative metrics with the same unit.' : 'Un radar nécessite au moins trois métriques positives ou nulles de même unité.');
    const ceiling = Math.max(1, ...fields.map(field => last.values[field.id]));
    const point = (index: number, radius: number) => `${150 + radius * Math.cos(index / fields.length * Math.PI * 2 - Math.PI / 2)},${150 + radius * Math.sin(index / fields.length * Math.PI * 2 - Math.PI / 2)}`;
    chart = <div className="text-center"><svg role="img" aria-label={title} viewBox="0 0 300 300" className="mx-auto h-56 w-56">{[.25, .5, .75, 1].map(fraction => <polygon key={fraction} points={fields.map((_, index) => point(index, 95 * fraction)).join(' ')} fill="none" stroke="currentColor" opacity=".15" />)}<polygon points={fields.map((field, index) => point(index, last.values[field.id] / ceiling * 95)).join(' ')} fill={color(fields[0])} fillOpacity=".15" stroke={color(fields[0])} />{fields.map((field, index) => { const [cx, cy] = point(index, last.values[field.id] / ceiling * 95).split(','); const [tx, ty] = point(index, 112).split(','); return <g key={field.id}><circle cx={cx} cy={cy} r="3" fill={color(field)}><title>{`${fieldLabel(field)}: ${format(last.values[field.id], field)}`}</title></circle><text x={tx} y={ty} fontSize="10" textAnchor="middle" fill="currentColor">{fieldLabel(field).slice(0, 12)}</text></g>; })}</svg><p className="text-xs">{last.period} · 0–{format(ceiling)}</p></div>;
  } else if (type === 'scatter') {
    if (fields.length !== 2) return unavailable(isEn ? 'A scatter plot requires exactly two metrics.' : 'Un nuage de points nécessite exactement deux métriques.');
    const xExtent = chartExtent(data.map(row => row.values[fields[0].id]), true);
    const xRange = xExtent.max - xExtent.min || 1;
    chart = svg(<>{axes}{data.map(row => <circle key={row.period} cx={left + (row.values[fields[0].id] - xExtent.min) / xRange * plotWidth} cy={y(row.values[fields[1].id])} r="4" fill={color(fields[0])} opacity=".75"><title>{rowTitle(row)}</title></circle>)}<text x={width / 2} y={height - 2} textAnchor="middle" fontSize="10">{fieldLabel(fields[0])}: {format(xExtent.min)}–{format(xExtent.max)}</text></>);
  } else if (type === 'heatmap' || type === 'table') {
    const magnitude = Math.max(Math.abs(min), Math.abs(max), 1);
    chart = <div className="max-h-80 overflow-auto"><table className="w-full min-w-[420px] text-xs"><caption className="sr-only">{title}</caption><thead className="sticky top-0" style={{ backgroundColor: 'rgb(var(--color-surface))' }}><tr><th className="p-2 text-left">{isEn ? 'Period' : 'Période'}</th>{fields.map(field => <th key={field.id} className="p-2 text-right">{fieldLabel(field)}</th>)}</tr></thead><tbody>{data.map(row => <tr key={row.period}><th scope="row" className="p-2 text-left font-normal">{row.period}</th>{fields.map(field => <td key={field.id} className="relative p-2 text-right tabular-nums"><span aria-hidden="true" className="absolute inset-1 rounded" style={type === 'heatmap' ? { backgroundColor: row.values[field.id] < 0 ? '#dc2626' : color(field), opacity: Math.abs(row.values[field.id]) / magnitude * .3 } : {}} /><span className="relative">{format(row.values[field.id], field)}</span></td>)}</tr>)}</tbody></table></div>;
  } else if (type === 'sparkline') {
    chart = <div className="space-y-4 p-3">{fields.map(field => <div key={field.id} className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>{fieldLabel(field)}</span><Sparkline data={rows.map(row => row.values[field.id])} width={160} height={32} showTrend={false} /><span>{format(last.values[field.id], field)}</span></div>)}</div>;
  } else if (type === 'waterfall') {
    if (fields.length !== 1) return unavailable(isEn ? 'Select one metric to show its changes between periods.' : 'Sélectionnez une métrique pour montrer ses variations entre les périodes.');
    const field = fields[0];
    const bars = data.map((row, index) => ({ period: row.period, start: index === 0 ? 0 : data[index - 1].values[field.id], end: row.values[field.id] }));
    const step = plotWidth / bars.length;
    chart = <div>{svg(<>{axes}{bars.map((bar, index) => <g key={bar.period}><rect x={left + index * step + step * .2} width={step * .6} y={Math.min(y(bar.start), y(bar.end))} height={Math.abs(y(bar.end) - y(bar.start))} fill={index === 0 ? color(field) : bar.end >= bar.start ? '#059669' : '#dc2626'}><title>{`${bar.period}: ${isEn ? 'change' : 'variation'} ${format(bar.end - bar.start)}; ${isEn ? 'value' : 'valeur'} ${format(bar.end)}`}</title></rect>{index < bars.length - 1 && <line x1={left + index * step + step * .8} x2={left + (index + 1) * step + step * .2} y1={y(bar.end)} y2={y(bar.end)} stroke="currentColor" opacity=".3" strokeDasharray="3 3" />}</g>)}</>)}<p className="text-center text-xs">{isEn ? 'First bar: recorded value. Following bars: change from the preceding period.' : 'Première barre : valeur enregistrée. Barres suivantes : variation depuis la période précédente.'}</p></div>;
  } else return unavailable(isEn ? 'This chart type is unavailable for these observations.' : 'Ce type de graphique est indisponible pour ces observations.');

  return <div className="min-w-0 space-y-3" data-chart-type={type}>
    {chart}
    {hoveredIndex !== null && data[hoveredIndex] && config.showTooltip !== false && (type === 'line' || type === 'area') && <p role="status" className="rounded border p-2 text-xs">{rowTitle(data[hoveredIndex])}</p>}
    {config.showLegend !== false && !['pie', 'donut', 'treemap', 'table', 'heatmap', 'sparkline', 'gauge'].includes(type) && <div className="flex flex-wrap justify-center gap-3 text-xs">{fields.map(field => <span key={field.id} className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color(field) }} />{fieldLabel(field)}</span>)}</div>}
    {paged && rows.length > PAGE_SIZE && <nav aria-label="Chart periods" className="flex flex-wrap items-center justify-center gap-3 text-xs"><button className="btn-secondary btn-sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>{isEn ? 'Previous' : 'Précédent'}</button><span>{safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, rows.length)} / {rows.length}</span><button className="btn-secondary btn-sm" disabled={(safePage + 1) * PAGE_SIZE >= rows.length} onClick={() => setPage(safePage + 1)}>{isEn ? 'Next' : 'Suivant'}</button></nav>}
  </div>;
}
