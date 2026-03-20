import { useActiviteiten } from '@/hooks/useRapportageData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ActiviteitFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

const ALL_VALUE = '__alle__';

export function ActiviteitFilter({ value, onChange }: ActiviteitFilterProps) {
  const { data: activiteiten = [], isLoading } = useActiviteiten();

  return (
    <Select
      value={value ?? ALL_VALUE}
      onValueChange={(v) => onChange(v === ALL_VALUE ? undefined : v)}
    >
      <SelectTrigger className="w-[220px]" disabled={isLoading}>
        <SelectValue placeholder="Alle activiteiten" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>Alle activiteiten</SelectItem>
        {activiteiten.map((act) => (
          <SelectItem key={act} value={act}>
            {act}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default ActiviteitFilter;
