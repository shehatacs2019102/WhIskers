import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { MAX_DAYS_AHEAD, addDays, formatFullDate, startOfDay, toIsoDate } from '../../../core/date-utils';
import { IconComponent } from '../../../shared/icon/icon';

interface DayCell {
  iso: string;
  day: number;
  /** Full date for screen readers, e.g. "Thursday 12 November 2026". */
  label: string;
  disabled: boolean;
  today: boolean;
}

const monthStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

/** Month grid for picking a booking date. Sundays, past days and days beyond the booking window are disabled. */
@Component({
  selector: 'app-booking-calendar',
  imports: [DatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-calendar.html',
  styleUrl: './booking-calendar.scss',
})
export class BookingCalendar {
  /** Selected date as "YYYY-MM-DD", or an empty string. */
  readonly selected = input('');
  readonly selectedChange = output<string>();

  private readonly today = startOfDay(new Date());
  private readonly lastBookable = addDays(this.today, MAX_DAYS_AHEAD);

  protected readonly viewMonth = signal(monthStart(this.today));
  protected readonly weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  protected readonly canGoPrev = computed(
    () => this.viewMonth().getTime() > monthStart(this.today).getTime(),
  );
  protected readonly canGoNext = computed(
    () => this.viewMonth().getTime() < monthStart(this.lastBookable).getTime(),
  );

  /** Leading blanks, then one cell per day of the visible month. */
  protected readonly cells = computed<(DayCell | null)[]>(() => {
    const month = this.viewMonth();
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const cells: (DayCell | null)[] = Array.from({ length: month.getDay() }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      cells.push({
        iso: toIsoDate(date),
        day,
        label: formatFullDate(date),
        disabled:
          date < this.today || date > this.lastBookable || date.getDay() === 0,
        today: date.getTime() === this.today.getTime(),
      });
    }
    return cells;
  });

  protected shiftMonth(delta: number): void {
    const current = this.viewMonth();
    this.viewMonth.set(new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  protected pick(cell: DayCell): void {
    if (!cell.disabled) this.selectedChange.emit(cell.iso);
  }
}
