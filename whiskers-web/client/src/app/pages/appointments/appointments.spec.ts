import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Service } from '../../core/models';
import { Appointments } from './appointments';

const SERVICES: Service[] = [
  { id: 1, name: 'Wellness check-up', detail: 'About 30 min', durationMinutes: 30 },
  { id: 2, name: 'Full groom', detail: 'About 90 min', durationMinutes: 90 },
];

const SLOTS = {
  date: '2026-11-09',
  slots: [
    { time: '09:00', available: true },
    { time: '09:30', available: false },
    { time: '13:00', available: true },
  ],
};

describe('Appointments', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Appointments>;
  let root: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 5, 8, 0));
    window.scrollTo = vi.fn();

    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Appointments);
    root = fixture.nativeElement;

    // The page asks for the services as soon as it is created.
    http.expectOne('/api/services').flush(SERVICES);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const buttonByText = (text: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === text,
    )!;

  /** Picks Monday 9 November and answers the availability request. */
  async function pickMonday() {
    buttonByText('9').click();
    await fixture.whenStable();
    const request = http.expectOne((r) => r.url === '/api/appointments/availability');
    expect(request.request.params.get('date')).toBe('2026-11-09');
    expect(request.request.params.get('serviceId')).toBe('1');
    request.flush(SLOTS);
    await fixture.whenStable();
  }

  function type(selector: string, value: string) {
    const input = $<HTMLInputElement>(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function fillDetails() {
    type('#ownerName', 'Sara Ahmed');
    type('#catName', 'Biscuit');
    type('#email', 'sara@example.com');
    await fixture.whenStable();
  }

  it('lists the services and selects the first one', () => {
    const titles = [...root.querySelectorAll('.option-title')].map((e) => e.textContent?.trim());
    expect(titles).toEqual(['Wellness check-up', 'Full groom']);
    expect($('.option.selected .option-title').textContent).toContain('Wellness check-up');
  });

  it('shows open and taken slots after a date is chosen', async () => {
    await pickMonday();

    const slots = [...root.querySelectorAll<HTMLButtonElement>('.slot')];
    expect(slots.map((s) => s.textContent?.trim())).toEqual(['9:00 AM', '9:30 AM', '1:00 PM']);
    expect(slots.map((s) => s.disabled)).toEqual([false, true, false]);
  });

  it('does not submit until a time and details are provided', async () => {
    await pickMonday();

    buttonByText('Confirm booking').click();
    await fixture.whenStable();

    http.expectNone('/api/appointments');
    expect(root.textContent).toContain('Please choose a service, a date and a time.');
    expect(root.textContent).toContain('Please enter your name.');
  });

  it('sends the booking, with a blank phone as null, and shows the confirmation', async () => {
    await pickMonday();
    buttonByText('9:00 AM').click();
    await fillDetails();

    buttonByText('Confirm booking').click();
    await fixture.whenStable();

    const post = http.expectOne('/api/appointments');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      serviceId: 1,
      startsAt: '2026-11-09T09:00:00',
      ownerName: 'Sara Ahmed',
      catName: 'Biscuit',
      email: 'sara@example.com',
      phone: null,
      notes: null,
    });

    post.flush({
      id: 7,
      serviceName: 'Wellness check-up',
      startsAt: '2026-11-09T09:00:00',
      ownerName: 'Sara Ahmed',
      catName: 'Biscuit',
      email: 'sara@example.com',
    });
    await fixture.whenStable();

    expect($('#done-title').textContent).toContain("You're booked");
    expect(root.textContent).toContain('#7');
  });

  it('refreshes the slots and keeps the form when the time was just taken (409)', async () => {
    await pickMonday();
    buttonByText('9:00 AM').click();
    await fillDetails();

    buttonByText('Confirm booking').click();
    await fixture.whenStable();
    http
      .expectOne('/api/appointments')
      .flush({ detail: 'That time was just taken.' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(root.textContent).toContain('That time was just taken.');
    expect($<HTMLInputElement>('#ownerName').value).toBe('Sara Ahmed');

    // It asks for fresh availability so the visitor can choose another time.
    http
      .expectOne((r) => r.url === '/api/appointments/availability')
      .flush({ ...SLOTS, slots: [{ time: '09:00', available: false }, ...SLOTS.slots.slice(1)] });
    await fixture.whenStable();
    expect(buttonByText('9:00 AM').disabled).toBe(true);
  });
});
