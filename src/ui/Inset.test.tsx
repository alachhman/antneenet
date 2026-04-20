import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Inset } from './Inset';

describe('<Inset>', () => {
  it('renders children and applies inset shadow', () => {
    const { container } = render(<Inset>x</Inset>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.boxShadow).toBeTruthy();
    expect(el.className).toContain('neu-inset');
  });
});
