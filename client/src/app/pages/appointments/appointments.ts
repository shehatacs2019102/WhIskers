import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';

import { API_CLIENT } from '../../core/api-client';
import { formatLongDate, formatTime12, toStartsAt } from '../../core/date-utils';
import { AppointmentConfirmation, Service, Slot } from '../../core/models';
import { IconComponent } from '../../shared/icon/icon';
import { BookingCalendar } from './booking-calendar/booking-calendar';

type DetailField = 'ownerName' | 'catName' | 'email' | 'phone' | 'notes';

const FIELD_ERRORS: Record<DetailField, Record<string, string>> = {
  ownerName: {
    required: 'Please enter your name.',
    minlength: 'Your name needs at least 2 letters.',
  },
  catName: { required: "Please enter your cat's name." },
  email: { required: 'Please enter your email.', email: 'That email address looks wrong.' },
  phone: { pattern: 'Use digits, spaces, + ( ) . or -, at least 7 characters.' },
  notes: { maxlength: 'Please keep notes under 500 characters.' },
};

@Component({
  selector: 'app-appointments',
  imports: [ReactiveFormsModule, RouterLink, BookingCalendar, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './appointments.html',
  styleUrl: './appointments.scss',
})
export class Appointments {
  private readonly api = inject(API_CLIENT);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly injector = inject(Injector);

  protected readonly formatTime = formatTime12;

  // What the visitor has chosen.
  protected readonly services = signal<Service[]>([]);
  protected readonly servicesState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly serviceId = signal(0);
  protected readonly date = signal('');
  protected readonly time = signal('');

  // Availability for the chosen service and date.
  protected readonly slots = signal<Slot[]>([]);
  protected readonly slotsState = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  private readonly reload = signal(0);

  // Submitting.
  protected readonly attempted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal('');
  protected readonly confirmation = signal<AppointmentConfirmation | null>(null);

  protected readonly details = this.fb.group({
    ownerName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    catName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.pattern(/^\+?[\d\s().-]{7,30}$/)]],
    notes: ['', [Validators.maxLength(500)]],
  });

  private readonly detailsStatus = toSignal(this.details.statusChanges, {
    initialValue: this.details.status,
  });

  protected readonly selectedService = computed(
    () => this.services().find((s) => s.id === this.serviceId()) ?? null,
  );
  protected readonly morning = computed(() => this.slots().filter((s) => s.time < '12:00'));
  protected readonly afternoon = computed(() => this.slots().filter((s) => s.time >= '12:00'));
  protected readonly anyFree = computed(() => this.slots().some((s) => s.available));
  protected readonly dateLabel = computed(() => (this.date() ? formatLongDate(this.date()) : ''));
  protected readonly timeLabel = computed(() => (this.time() ? formatTime12(this.time()) : ''));
  protected readonly missingChoice = computed(
    () => this.attempted() && (!this.serviceId() || !this.date() || !this.time()),
  );
  private readonly canSubmit = computed(
    () =>
      this.serviceId() > 0 &&
      !!this.date() &&
      !!this.time() &&
      this.detailsStatus() === 'VALID',
  );

  constructor() {
    this.api
      .getServices()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (list) => {
          this.services.set(list);
          this.serviceId.set(this.initialServiceId(list));
          this.servicesState.set('ready');
        },
        error: () => this.servicesState.set('error'),
      });

    // Whenever the service, date or a manual reload changes, fetch fresh slots.
    // switchMap drops the answer to an earlier request if a newer one is made.
    toObservable(
      computed(() => ({
        date: this.date(),
        serviceId: this.serviceId(),
        reload: this.reload(),
      })),
    )
      .pipe(
        tap(({ date, serviceId }) => this.slotsState.set(date && serviceId ? 'loading' : 'idle')),
        switchMap(({ date, serviceId }) =>
          date && serviceId
            ? this.api.getAvailability(date, serviceId).pipe(catchError(() => of(null)))
            : of(undefined),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (!result) {
          this.slots.set([]);
          this.slotsState.set(result === null ? 'error' : 'idle');
          return;
        }
        this.slots.set(result.slots);
        this.slotsState.set('ready');
        const chosen = this.time();
        if (chosen && !result.slots.some((s) => s.time === chosen && s.available)) {
          this.time.set('');
        }
      });
  }

  protected chooseService(id: number): void {
    this.serviceId.set(id);
  }

  protected onDateChange(iso: string): void {
    this.date.set(iso);
    this.time.set('');
  }

  protected chooseTime(slot: Slot): void {
    if (slot.available) this.time.set(slot.time);
  }

  protected retryServices(): void {
    window.location.reload();
  }

  protected retrySlots(): void {
    this.reload.update((n) => n + 1);
  }

  protected showError(field: DetailField): boolean {
    const control = this.details.controls[field];
    return control.invalid && (control.touched || this.attempted());
  }

  protected errorText(field: DetailField): string {
    const errors = this.details.controls[field].errors ?? {};
    const key = Object.keys(errors).find((k) => k in FIELD_ERRORS[field]);
    return key ? FIELD_ERRORS[field][key] : 'Please check this field.';
  }

  protected submit(): void {
    this.attempted.set(true);
    this.submitError.set('');
    this.details.markAllAsTouched();
    if (!this.canSubmit() || this.submitting()) return;

    const value = this.details.getRawValue();
    this.submitting.set(true);

    this.api
      .createAppointment({
        serviceId: this.serviceId(),
        startsAt: toStartsAt(this.date(), this.time()),
        ownerName: value.ownerName.trim(),
        catName: value.catName.trim(),
        email: value.email.trim(),
        // The API rejects an empty phone string, so send null when it is blank.
        phone: value.phone.trim() || null,
        notes: value.notes.trim() || null,
      })
      .subscribe({
        next: (confirmation) => {
          this.submitting.set(false);
          this.confirmation.set(confirmation);
          // Bring the confirmation into view and move focus to it for keyboard and screen reader users.
          afterNextRender(
            () => {
              window.scrollTo({ top: 0 });
              document.getElementById('done-title')?.focus();
            },
            { injector: this.injector },
          );
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          if (error.status === 409) {
            // Someone else took the time. Refresh the slots so the visitor can pick another.
            this.submitError.set(
              error.error?.detail ?? 'That time was just taken. Please pick another.',
            );
            this.time.set('');
            this.retrySlots();
          } else if (error.status === 400) {
            this.submitError.set('Some details were not accepted. Please check them and try again.');
          } else {
            this.submitError.set(
              'We could not save your booking just now. Please try again in a moment.',
            );
          }
        },
      });
  }

  protected bookAnother(): void {
    this.confirmation.set(null);
    this.attempted.set(false);
    this.submitError.set('');
    this.time.set('');
    this.details.reset();
    this.retrySlots();
  }

  private initialServiceId(list: Service[]): number {
    const requested = Number(this.route.snapshot.queryParamMap.get('service'));
    return list.find((s) => s.id === requested)?.id ?? list[0]?.id ?? 0;
  }
}
