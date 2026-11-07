import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, timer } from 'rxjs';

import type { ApiClient } from './api-client';
import { MAX_DAYS_AHEAD, addDays, parseIsoDate, startOfDay, toIsoDate } from './date-utils';
import {
  AppointmentConfirmation,
  Availability,
  CreateAppointmentRequest,
  Service,
  Slot,
} from './models';

/** Same services as the API's seed data (api/Data/WhiskersDbContext.cs). */
const SERVICES: Service[] = [
  { id: 1, name: 'Wellness check-up', detail: 'About 30 min', durationMinutes: 30 },
  { id: 2, name: 'Full groom', detail: 'About 90 min', durationMinutes: 90 },
  { id: 3, name: 'Nail trim', detail: 'About 20 min', durationMinutes: 20 },
  { id: 4, name: 'Boarding', detail: 'Overnight stays', durationMinutes: 30 },
];

const STORAGE_KEY = 'whiskers-bookings';
export const DEMO_LATENCY_MS = 250;

// Opening hours, in minutes after midnight. They mirror api/Services/AvailabilityService.cs.
const SLOT_MINUTES = 30;
const MORNING_END = 12 * 60;
const AFTERNOON_END = 18 * 60;

const range = (from: number, to: number, step: number): number[] => {
  const values: number[] = [];
  for (let value = from; value < to; value += step) values.push(value);
  return values;
};

const SLOT_STARTS = [
  ...range(9 * 60, MORNING_END, SLOT_MINUTES),
  ...range(13 * 60, AFTERNOON_END, SLOT_MINUTES),
];

const pad = (n: number): string => String(n).padStart(2, '0');
const toTime = (minutes: number): string => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
const sessionEnd = (start: number): number => (start < MORNING_END ? MORNING_END : AFTERNOON_END);

interface Interval {
  start: number;
  end: number;
}

interface StoredBooking extends AppointmentConfirmation {
  serviceId: number;
}

/** Small stable hash, so the same date always gets the same pattern of taken slots. */
function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Roughly one slot in five is already taken, so the calendar looks lived in. */
function seededBusy(date: string): Interval[] {
  return SLOT_STARTS.filter((start) => hash(`${date}T${toTime(start)}`) % 100 < 20).map((start) => ({
    start,
    end: start + SLOT_MINUTES,
  }));
}

function problem(status: number, detail: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText: String(status), error: { detail } });
}

/**
 * Stands in for the .NET API in the demo build. It applies the same booking rules and returns
 * the same errors, and remembers bookings in the visitor's browser.
 */
@Injectable({ providedIn: 'root' })
export class DemoApiService implements ApiClient {
  /** Overridden in tests to skip the pause. */
  latencyMs = DEMO_LATENCY_MS;

  private fallback: StoredBooking[] = [];

  getServices(): Observable<Service[]> {
    return this.respond(() => SERVICES.map((service) => ({ ...service })));
  }

  getAvailability(date: string, serviceId: number): Observable<Availability> {
    return this.respond(() => {
      if (date > this.lastBookableDate()) {
        throw problem(400, `Bookings open up to ${MAX_DAYS_AHEAD} days ahead.`);
      }
      const service = this.findService(serviceId);
      if (!service) throw problem(404, 'That service does not exist.');

      return { date, slots: this.slots(date, service.durationMinutes) };
    });
  }

  createAppointment(request: CreateAppointmentRequest): Observable<AppointmentConfirmation> {
    return this.respond(() => {
      const service = this.findService(request.serviceId);
      if (!service) throw problem(400, 'That service does not exist.');

      const [date, time] = request.startsAt.split('T');
      if (!this.isFree(date, toMinutes(time.slice(0, 5)), service.durationMinutes)) {
        throw problem(409, 'That time is no longer available. Please pick another.');
      }

      const bookings = this.load();
      const booking: StoredBooking = {
        id: Math.max(0, ...bookings.map((b) => b.id)) + 1,
        serviceId: service.id,
        serviceName: service.name,
        startsAt: request.startsAt,
        ownerName: request.ownerName,
        catName: request.catName,
        email: request.email,
      };
      this.save([...bookings, booking]);

      const { serviceId: _serviceId, ...confirmation } = booking;
      return confirmation;
    });
  }

  private respond<T>(work: () => T): Observable<T> {
    return timer(this.latencyMs).pipe(map(work));
  }

  private findService(id: number): Service | undefined {
    return SERVICES.find((service) => service.id === id);
  }

  private lastBookableDate(): string {
    return toIsoDate(addDays(startOfDay(new Date()), MAX_DAYS_AHEAD));
  }

  private slots(date: string, durationMinutes: number): Slot[] {
    if (parseIsoDate(date).getDay() === 0) return [];
    return SLOT_STARTS.map((start) => ({
      time: toTime(start),
      available: this.isFree(date, start, durationMinutes),
    }));
  }

  private isFree(date: string, start: number, durationMinutes: number): boolean {
    const day = parseIsoDate(date);
    if (!SLOT_STARTS.includes(start)) return false;
    if (day.getDay() === 0) return false;
    if (date > this.lastBookableDate()) return false;

    day.setHours(Math.floor(start / 60), start % 60);
    if (day <= new Date()) return false;

    const end = start + durationMinutes;
    if (end > sessionEnd(start)) return false;

    return !this.busy(date).some((other) => start < other.end && end > other.start);
  }

  private busy(date: string): Interval[] {
    const mine = this.load()
      .filter((booking) => booking.startsAt.startsWith(date))
      .map((booking) => {
        const start = toMinutes(booking.startsAt.slice(11, 16));
        const service = this.findService(booking.serviceId);
        return { start, end: start + (service?.durationMinutes ?? SLOT_MINUTES) };
      });
    return [...seededBusy(date), ...mine];
  }

  private load(): StoredBooking[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (Array.isArray(parsed)) return parsed as StoredBooking[];
    } catch {
      // Storage can be unavailable or hold junk (private windows, blocked cookies). Fall through.
    }
    return this.fallback;
  }

  private save(bookings: StoredBooking[]): void {
    this.fallback = bookings;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    } catch {
      // Keep the in-memory copy so the booking still works for this visit.
    }
  }
}
