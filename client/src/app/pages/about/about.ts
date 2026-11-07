import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container">
      <h1 class="display-l">About Whiskers</h1>
      <p class="lead">
        Whiskers is a portfolio project: a concept website for a cat care business. It is not a real
        business, and the services, opening hours and contact details are made up.
      </p>
      <p>
        It was designed in Figma and built with Angular. The full source code, including the .NET
        API and the tests, is on GitHub.
      </p>
      <div class="actions">
        <a
          class="btn btn--secondary"
          href="https://github.com/shehatacs2019102/WhIskers"
          target="_blank"
          rel="noopener noreferrer"
          >View the source on GitHub</a
        >
        <a class="btn btn--primary" routerLink="/appointments">Try the booking page</a>
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
    p {
      max-width: 64ch;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }
  `,
})
export class About {}
