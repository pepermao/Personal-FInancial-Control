import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

export type PeriodType = 'all' | 'year' | 'month';

export interface PeriodPickerProps {
  periodType: PeriodType;
  /** Selected year, e.g. "2026". Used when periodType === 'year'. */
  year: string;
  /** Selected month, e.g. "2026-06". Used when periodType === 'month'. */
  month: string;
  onPeriodTypeChange: (type: PeriodType) => void;
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
  minDate?: Date;
  maxDate?: Date;
  /** Show a "Tudo" toggle option for an unscoped, all-time view. */
  showAllOption?: boolean;
}

export function monthStringToDate(month: string): Date {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1);
}

export function dateToMonthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const toggleButtonSx = { px: 1.5, py: 0.5, fontSize: 12.5 };

export function PeriodPicker({
  periodType,
  year,
  month,
  onPeriodTypeChange,
  onYearChange,
  onMonthChange,
  minDate,
  maxDate,
  showAllOption,
}: PeriodPickerProps) {
  return (
    <Stack direction="row" spacing={1}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={periodType}
        onChange={(_, value: PeriodType | null) => value && onPeriodTypeChange(value)}
      >
        {showAllOption && (
          <ToggleButton value="all" sx={toggleButtonSx}>
            Tudo
          </ToggleButton>
        )}
        <ToggleButton value="year" sx={toggleButtonSx}>
          Ano
        </ToggleButton>
        <ToggleButton value="month" sx={toggleButtonSx}>
          Mês
        </ToggleButton>
      </ToggleButtonGroup>

      {periodType === 'year' && (
        <DatePicker
          views={['year']}
          openTo="year"
          value={new Date(Number(year), 0, 1)}
          onChange={(newValue) => newValue && onYearChange(String(newValue.getFullYear()))}
          minDate={minDate}
          maxDate={maxDate}
          format="yyyy"
          slotProps={{ textField: { size: 'small', sx: { width: 120 } } }}
        />
      )}

      {periodType === 'month' && (
        <DatePicker
          views={['year', 'month']}
          openTo="month"
          value={monthStringToDate(month)}
          onChange={(newValue) => newValue && onMonthChange(dateToMonthString(newValue))}
          minDate={minDate}
          maxDate={maxDate}
          format="MM/yyyy"
          slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
        />
      )}
    </Stack>
  );
}
