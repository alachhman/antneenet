import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Label } from './Label';

describe('<Label>', () => {
  it('renders the bar glyph and uppercase text', () => {
    render(<Label>stocks</Label>);
    const el = screen.getByText(/stocks/i);
    expect(el.textContent).toMatch(/▮/);
    expect(el).toHaveStyle({ textTransform: 'uppercase' });
  });
});
