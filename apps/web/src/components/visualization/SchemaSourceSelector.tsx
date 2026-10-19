import { useI18n } from '../../lib/i18n';
import { GOLD_SCHEMA } from '../../lib/goldSchema';
import type { DataSourceReference } from '../../lib/visualizationTypes';

export default function SchemaSourceSelector({ selectedSources, onSelectionChange }: {
  selectedSources: DataSourceReference[];
  onSelectionChange: (sources: DataSourceReference[]) => void;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  return <fieldset className="space-y-3"><legend className="text-sm font-medium">{isEn ? 'Accounting data sets' : 'Ensembles de données comptables'}</legend>
    <div className="grid gap-3 sm:grid-cols-2">{Object.values(GOLD_SCHEMA).map(source => {
      const selected = selectedSources.some(item => item.id === source.id);
      return <label key={source.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[rgb(var(--color-border))] p-4">
        <input type="checkbox" checked={selected} onChange={() => onSelectionChange(selected ? selectedSources.filter(item => item.id !== source.id) : [...selectedSources, { id: source.id }])} />
        <span className="min-w-0"><span className="block font-medium">{isEn ? source.nameEn : source.name}</span><span className="block text-sm text-muted">{isEn ? source.descriptionEn : source.description}</span></span>
      </label>;
    })}</div></fieldset>;
}
