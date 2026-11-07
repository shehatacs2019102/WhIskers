import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/** Placeholder for pages that are not designed yet (About, Store) and for unknown URLs. */
@Component({
  selector: 'app-coming-soon',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container">
      <h1 class="display-l">{{ heading }}</h1>
      <p class="lead">
        {{ notFound ? 'Try the home page, or book a visit.' : 'This page is on its way.' }}
      </p>
      <div class="actions">
        <a class="btn btn--secondary" routerLink="/">Back to home</a>
        <a class="btn btn--primary" routerLink="/appointments">Book an appointment</a>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    section {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
      min-height: 50vh;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }
  `,
})
export class ComingSoon {
  private readonly data = inject(ActivatedRoute).snapshot.data;

  protected readonly heading: string = this.data['heading'] ?? 'Coming soon';
  protected readonly notFound: boolean = this.data['notFound'] ?? false;
}
