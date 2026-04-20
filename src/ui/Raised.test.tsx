import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Raised } from './Raised';

describe('<Raised>', () => {
  it('renders children', () => {
    render(<Raised>hello</Raised>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('applies raised box-shadow via inline style or class', () => {
    const { container } = render(<Raised data-testid="card">x</Raised>);
    const el = container.firstElementChild as HTMLElement;
    const style = getComputedStyle(el);
    expect(el.style.boxShadow || style.boxShadow).toBeTruthy();
  });

  it('forwards className and extra props', () => {
    render(<Raised className="extra" aria-label="card">x</Raised>);
    const el = screen.getByLabelText('card');
    expect(el.className).toContain('extra');
  });
});
