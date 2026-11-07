import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('renders the header, main content area and footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-site-header')).toBeTruthy();
    expect(root.querySelector('main#main')).toBeTruthy();
    expect(root.querySelector('app-site-footer')).toBeTruthy();
  });

  it('links to every page in the main navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const labels = [...(fixture.nativeElement as HTMLElement).querySelectorAll('nav[aria-label="Main"] a')]
      .map((a) => a.textContent?.trim())
      .filter((t) => t !== 'Book now');

    expect(labels).toEqual(['Home', 'Appointments', 'About', 'Store']);
  });
});
