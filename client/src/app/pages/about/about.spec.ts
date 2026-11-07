import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { About } from './about';

describe('About', () => {
  async function render() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(About);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('says plainly that this is a portfolio project, not a real business', async () => {
    const text = (await render()).textContent ?? '';
    expect(text).toContain('portfolio project');
    expect(text).toContain('not a real business');
  });

  it('links to the source code safely', async () => {
    const link = (await render()).querySelector<HTMLAnchorElement>('a[href*="github.com"]')!;
    expect(link.href).toContain('github.com/shehatacs2019102/WhIskers');
    expect(link.rel).toContain('noopener');
  });
});
