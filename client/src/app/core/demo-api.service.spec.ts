import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { DemoApiService } from './demo-api.service';
import { Availability, CreateAppointmentRequest } from './models';

describe('DemoApiService', () => {
  let api: DemoApiService;

  beforeEach(() => {
    // Thursday 5 November 2026, 08:00. Only Date is faked so timers keep working.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 5, 8, 0));
    localStorage.clear();

    api = new DemoApiService();
    api.latencyMs = 0;
  });

  afterEach(() => vi.useRealTimers());

  const MONDAY = '2026-11-09';
  const SUNDAY = '2026-11-08';

  const availability = (date: string, serviceId = 1): Promise<Availability> =>
    firstValueFrom(api.getAvailability(date, serviceId));

  const times = (day: Availability, available?: boolean) =>
    day.slots.filter((s) => available === undefined || s.available === available).map((s) => s.time);

  const request = (startsAt: string, serviceId = 1): CreateAppointmentRequest => ({
    serviceId,
    startsAt,
    ownerName: 'Sara Ahmed',
    catName: 'Biscuit',
    email: 'sara@example.com',
    phone: null,
    notes: null,
  });

  const book = (startsAt: string, serviceId = 1) =>
    firstValueFrom(api.createAppointment(request(startsAt, serviceId)));

  const statusOf = async (promise: Promise<unknown>): Promise<number> => {
    try {
      await promise;
      return 200;
    } catch (error) {
      return (error as HttpErrorResponse).status;
    }
  };

  /** The first slot on Monday that is free for the service (some are pre-filled to look busy). */
  async function firstFree(serviceId = 1): Promise<string> {
    const day = await availability(MONDAY, serviceId);
    return `${MONDAY}T${times(day, true)[0]}:00`;
  }

  it('lists the four services', async () => {
    const services = await firstValueFrom(api.getServices());
    expect(services.map((s) => s.name)).toEqual([
      'Wellness check-up',
      'Full groom',
      'Nail trim',
      'Boarding',
    ]);
  });

  it('offers 16 half-hour slots with a lunch break, and none on Sunday', async () => {
    const day = await availability(MONDAY);
    expect(day.slots).toHaveLength(16);
    expect(times(day)).toContain('11:30');
    expect(times(day)).not.toContain('12:00');
    expect(times(day)[6]).toBe('13:00');
    expect((await availability(SUNDAY)).slots).toEqual([]);
  });

  it('shows the same pattern of taken slots every time for a date', async () => {
    expect(times(await availability(MONDAY), true)).toEqual(times(await availability(MONDAY), true));
  });

  it('leaves some slots taken and some free', async () => {
    const busy = times(await availability('2026-11-12'), false).length;
    expect(busy).toBeGreaterThan(0);
    expect(busy).toBeLessThan(16);
  });

  it('does not offer times that have passed', async () => {
    vi.setSystemTime(new Date(2026, 10, 9, 10, 15));
    const free = times(await availability(MONDAY), true);
    expect(free).not.toContain('09:00');
    expect(free).not.toContain('10:00');
  });

  it('does not offer a long service that would run into lunch or closing', async () => {
    const groom = await availability(MONDAY, 2);
    const state = (time: string) => groom.slots.find((s) => s.time === time)!.available;
    expect(state('11:00')).toBe(false);
    expect(state('11:30')).toBe(false);
    expect(state('17:00')).toBe(false);
    expect(state('17:30')).toBe(false);
  });

  it('books a free slot and then reports it as taken', async () => {
    const startsAt = await firstFree();
    const confirmation = await book(startsAt);

    expect(confirmation).toMatchObject({
      id: 1,
      serviceName: 'Wellness check-up',
      startsAt,
      ownerName: 'Sara Ahmed',
      catName: 'Biscuit',
    });
    expect(times(await availability(MONDAY), true)).not.toContain(startsAt.slice(11, 16));
  });

  it('rejects booking the same time twice with a 409', async () => {
    const startsAt = await firstFree();
    await book(startsAt);
    expect(await statusOf(book(startsAt, 3))).toBe(409);
  });

  it('blocks slots that overlap a longer booking', async () => {
    const startsAt = await firstFree(2);
    await book(startsAt, 2);
    const startMinutes = Number(startsAt.slice(11, 13)) * 60 + Number(startsAt.slice(14, 16));

    const day = await availability(MONDAY, 1);
    for (const slot of day.slots) {
      const minutes = Number(slot.time.slice(0, 2)) * 60 + Number(slot.time.slice(3));
      if (minutes >= startMinutes && minutes < startMinutes + 90) expect(slot.available).toBe(false);
    }
  });

  it.each([
    ['a Sunday', `${SUNDAY}T10:00:00`],
    ['a time off the half-hour grid', `${MONDAY}T10:15:00`],
    ['lunch time', `${MONDAY}T12:00:00`],
    ['after closing', `${MONDAY}T18:00:00`],
    ['a time in the past', '2026-11-04T10:00:00'],
  ])('rejects a booking at %s with a 409', async (_label, startsAt) => {
    expect(await statusOf(book(startsAt))).toBe(409);
  });

  it('rejects an unknown service', async () => {
    expect(await statusOf(book(`${MONDAY}T10:00:00`, 99))).toBe(400);
    expect(await statusOf(firstValueFrom(api.getAvailability(MONDAY, 99)))).toBe(404);
  });

  it('only opens bookings 90 days ahead', async () => {
    expect(await statusOf(availability('2027-06-01'))).toBe(400);
  });

  it('remembers bookings in the browser between visits', async () => {
    const startsAt = await firstFree();
    await book(startsAt);

    const nextVisit = new DemoApiService();
    nextVisit.latencyMs = 0;
    const day = await firstValueFrom(nextVisit.getAvailability(MONDAY, 1));
    expect(times(day, true)).not.toContain(startsAt.slice(11, 16));
  });

  it('still works when browser storage is unavailable', async () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
    try {
      const startsAt = await firstFree();
      await book(startsAt);
      expect(times(await availability(MONDAY), true)).not.toContain(startsAt.slice(11, 16));
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
