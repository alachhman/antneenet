import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Inset } from './Inset';

describe('<Inset>', () => {
  it('renders children and applies inset shadow', () => {
    render(<Inset>x</Inset>);
    const el = screen.getByText('x').parentElement!;
    expect(el.style.boxShadow).toContain('--inset');
  });
});
