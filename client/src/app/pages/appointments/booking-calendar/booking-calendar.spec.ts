import { TestBed } from '@angular/core/testing';

import { BookingCalendar } from './booking-calendar';

describe('BookingCalendar', () => {
  beforeEach(() => {
    // Thursday 5 November 2026. Only Date is faked so Angular's scheduling keeps working.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 5, 8, 0));
  });

  afterEach(() => vi.useRealTimers());

  async function render() {
    const fixture = TestBed.createComponent(BookingCalendar);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const day = (n: number) =>
      [...root.querySelectorAll<HTMLButtonElement>('button.day')].find(
        (b) => b.textContent?.trim() === String(n),
      )!;
    return { fixture, root, day };
  }

  it('disables past days and Sundays, and keeps today and other weekdays open', async () => {
    const { day } = await render();
    expect(day(4).disabled).toBe(true); // yesterday
    expect(day(5).disabled).toBe(false); // today
    expect(day(8).disabled).toBe(true); // Sunday
    expect(day(9).disabled).toBe(false); // Monday
  });

  it('marks today', async () => {
    const { day } = await render();
    expect(day(5).classList).toContain('today');
  });

  it('emits the chosen date and ignores disabled days', async () => {
    const { fixture, day } = await render();
    const picked: string[] = [];
    fixture.componentInstance.selectedChange.subscribe((iso) => picked.push(iso));

    day(9).click();
    day(8).click();

    expect(picked).toEqual(['2026-11-09']);
  });

  it('cannot go back before the current month', async () => {
    const { root } = await render();
    const prev = root.querySelector<HTMLButtonElement>('button[aria-label="Previous month"]')!;
    expect(prev.disabled).toBe(true);
  });

  it('moves to the next month and stops at the booking window', async () => {
    const { fixture, root } = await render();
    const next = () => root.querySelector<HTMLButtonElement>('button[aria-label="Next month"]')!;

    for (let i = 0; i < 6 && !next().disabled; i++) {
      next().click();
      await fixture.whenStable();
    }

    // 90 days from 5 Nov 2026 is 3 Feb 2027, so February is the last month shown.
    expect(root.querySelector('.month-label')?.textContent).toContain('February 2027');
    expect(next().disabled).toBe(true);
  });
});
