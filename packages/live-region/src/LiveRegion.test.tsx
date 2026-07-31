import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LiveRegion } from './index';

describe('@pineappleui/live-region', () => {
  it('defaults to a polite, non-atomic div', () => {
    const { container } = render(<LiveRegion>Ready</LiveRegion>);
    const el = container.firstElementChild;
    expect(el?.tagName).toBe('DIV');
    expect(el?.getAttribute('aria-live')).toBe('polite');
    expect(el?.hasAttribute('aria-atomic')).toBe(false);
    expect(el?.textContent).toBe('Ready');
  });

  it('supports atomic announcements and assertive politeness', () => {
    const { container } = render(
      <LiveRegion politeness="assertive" atomic>
        Caption text
      </LiveRegion>,
    );
    const el = container.firstElementChild;
    expect(el?.getAttribute('aria-live')).toBe('assertive');
    expect(el?.getAttribute('aria-atomic')).toBe('true');
  });

  it('renders a custom element, role, id, and className', () => {
    const { container } = render(
      <LiveRegion as="p" role="status" id="notice" className="calm">
        Notice
      </LiveRegion>,
    );
    const el = container.firstElementChild;
    expect(el?.tagName).toBe('P');
    expect(el?.getAttribute('role')).toBe('status');
    expect(el?.getAttribute('id')).toBe('notice');
    expect(el?.getAttribute('class')).toBe('calm');
  });

  it('stays mounted while children change (announcement contract)', () => {
    const { container, rerender } = render(<LiveRegion>first</LiveRegion>);
    const el = container.firstElementChild;
    rerender(<LiveRegion>second</LiveRegion>);
    expect(container.firstElementChild).toBe(el);
    expect(el?.textContent).toBe('second');
  });
});
