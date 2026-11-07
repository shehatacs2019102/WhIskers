/** Shapes returned and accepted by the Whiskers API (see api/Dtos/Dtos.cs). */

export interface Service {
  id: number;
  name: string;
  detail: string;
  durationMinutes: number;
}

export interface Slot {
  /** Start time as "HH:mm", clinic-local. */
  time: string;
  available: boolean;
}

export interface Availability {
  /** "YYYY-MM-DD" */
  date: string;
  slots: Slot[];
}

export interface CreateAppointmentRequest {
  serviceId: number;
  /** "YYYY-MM-DDTHH:mm:00", clinic-local, no offset. */
  startsAt: string;
  ownerName: string;
  catName: string;
  email: string;
  phone: string | null;
  notes: string | null;
}

export interface AppointmentConfirmation {
  id: number;
  serviceName: string;
  startsAt: string;
  ownerName: string;
  catName: string;
  email: string;
}
