import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { DemoApiService } from './demo-api.service';
import { HttpApiService } from './http-api.service';
import {
  AppointmentConfirmation,
  Availability,
  CreateAppointmentRequest,
  Service,
} from './models';

/** Everything the pages need from a backend. */
export interface ApiClient {
  getServices(): Observable<Service[]>;
  getAvailability(date: string, serviceId: number): Observable<Availability>;
  createAppointment(request: CreateAppointmentRequest): Observable<AppointmentConfirmation>;
}

/**
 * The backend the pages talk to. Pages inject this token rather than a concrete class, so
 * the build decides which one is used (see environment.ts and the "demo" configuration).
 */
export const API_CLIENT = new InjectionToken<ApiClient>('API_CLIENT', {
  providedIn: 'root',
  factory: () => (environment.demo ? inject(DemoApiService) : inject(HttpApiService)),
});
