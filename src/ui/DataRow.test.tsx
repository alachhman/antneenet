import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataRow } from './DataRow';

describe('<DataRow>', () => {
  it('renders label and value', () => {
    render(<DataRow label="AAPL" value="232.14" />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('232.14')).toBeInTheDocument();
  });

  it('colors up and down correctly', () => {
    const { rerender } = render(<DataRow label="x" value="1" trend="up" />);
    expect(screen.getByText('1')).toHaveStyle({ color: 'var(--up)' });

    rerender(<DataRow label="x" value="1" trend="down" />);
    expect(screen.getByText('1')).toHaveStyle({ color: 'var(--down)' });
  });
});
