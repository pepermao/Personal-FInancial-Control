import { useState } from 'react';
import { monthStringToDate, type PeriodType } from '../components/PeriodPicker';

interface PeriodBounds {
  /** All competenceMonth values in the current dataset (from tx or summary). */
  months?: string[] | undefined;
  earliestMonth?: string | null | undefined;
  latestMonth?: string | null | undefined;
}

/**
 * State container for PeriodPicker. Derives sensible defaults from a dataset's month bounds:
 * defaults to the year of the latest month; falls back to current year.
 *
 * Returns everything a page needs to render PeriodPicker + filter data by period.
 */
export function usePeriodState(bounds: PeriodBounds, initialType: PeriodType = 'year') {
  const [periodType, setPeriodType] = useState<PeriodType>(initialType);
  const [year, setYear] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<string | undefined>(undefined);

  const derivedMonths =
    bounds.months ?? (bounds.earliestMonth && bounds.latestMonth ? [bounds.earliestMonth, bounds.latestMonth] : []);
  const earliestMonth =
    bounds.earliestMonth ?? (derivedMonths.length ? derivedMonths.reduce((a, b) => (a < b ? a : b)) : undefined);
  const latestMonth =
    bounds.latestMonth ?? (derivedMonths.length ? derivedMonths.reduce((a, b) => (a > b ? a : b)) : undefined);
  const defaultYear = latestMonth?.slice(0, 4) ?? String(new Date().getFullYear());

  const effectiveYear = year ?? defaultYear;
  const effectiveMonth = month ?? latestMonth ?? `${effectiveYear}-01`;
  const minDate = earliestMonth ? monthStringToDate(earliestMonth) : undefined;
  const maxDate = new Date();

  const handlePeriodTypeChange = (value: PeriodType) => {
    if (value === periodType) return;
    if (value === 'month' && !month) setMonth(latestMonth ?? `${effectiveYear}-01`);
    if (value === 'year' && !year) setYear(defaultYear);
    setPeriodType(value);
  };

  /** True if a given competenceMonth string (YYYY-MM) falls within the current selection. */
  const includes = (competenceMonth: string) => {
    if (periodType === 'all') return true;
    if (periodType === 'year') return competenceMonth.startsWith(effectiveYear);
    return competenceMonth === effectiveMonth;
  };

  return {
    periodType,
    year,
    month,
    effectiveYear,
    effectiveMonth,
    minDate,
    maxDate,
    setYear,
    setMonth,
    onPeriodTypeChange: handlePeriodTypeChange,
    includes,
  };
}
