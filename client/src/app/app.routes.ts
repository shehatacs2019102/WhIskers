import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Whiskers | Care just for cats',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'appointments',
    title: 'Book an appointment | Whiskers',
    loadComponent: () =>
      import('./pages/appointments/appointments').then((m) => m.Appointments),
  },
  {
    path: 'about',
    title: 'About | Whiskers',
    loadComponent: () => import('./pages/about/about').then((m) => m.About),
  },
  {
    path: 'store',
    title: 'Store | Whiskers',
    data: { heading: 'The Whiskers store' },
    loadComponent: () => import('./pages/coming-soon/coming-soon').then((m) => m.ComingSoon),
  },
  {
    path: '**',
    title: 'Page not found | Whiskers',
    data: { heading: 'We could not find that page', notFound: true },
    loadComponent: () => import('./pages/coming-soon/coming-soon').then((m) => m.ComingSoon),
  },
];
