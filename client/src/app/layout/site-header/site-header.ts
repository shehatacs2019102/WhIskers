import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { IconComponent } from '../../shared/icon/icon';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  host: { '(document:keydown.escape)': 'close()' },
})
export class SiteHeader {
  protected readonly open = signal(false);

  protected readonly links = [
    { path: '/', label: 'Home', exact: true },
    { path: '/appointments', label: 'Appointments', exact: false },
    { path: '/about', label: 'About', exact: false },
    { path: '/store', label: 'Store', exact: false },
  ];

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }
}
