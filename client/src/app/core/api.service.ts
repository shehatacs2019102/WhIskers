import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AppointmentConfirmation,
  Availability,
  CreateAppointmentRequest,
  Service,
} from './models';

/** In development `ng serve` proxies /api to the .NET API (see proxy.conf.json). */
const API_BASE = '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getServices(): Observable<Service[]> {
    return this.http.get<Service[]>(`${API_BASE}/services`);
  }

  getAvailability(date: string, serviceId: number): Observable<Availability> {
    const params = new HttpParams().set('date', date).set('serviceId', serviceId);
    return this.http.get<Availability>(`${API_BASE}/appointments/availability`, { params });
  }

  createAppointment(request: CreateAppointmentRequest): Observable<AppointmentConfirmation> {
    return this.http.post<AppointmentConfirmation>(`${API_BASE}/appointments`, request);
  }
}
