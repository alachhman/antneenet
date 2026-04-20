import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { View } from './View';
import { Settings } from './Settings';

describe('bookmarks view', () => {
  it('shows placeholder when empty', () => {
    render(<View instanceId="x" config={{ items: [] }} />);
    expect(screen.getByText(/add bookmarks/i)).toBeInTheDocument();
  });

  it('renders tiles with favicon img and label', () => {
    render(<View instanceId="x" config={{ items: [{ name: 'GH', url: 'https://github.com' }] }} />);
    expect(screen.getByText('GH')).toBeInTheDocument();
    const img = screen.getByRole('img', { hidden: true });
    expect(img.getAttribute('src')).toContain('google.com/s2/favicons');
  });
});

describe('bookmarks settings', () => {
  it('adds a bookmark when + clicked', async () => {
    const onChange = vi.fn();
    render(<Settings config={{ items: [] }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /add bookmark/i }));
    expect(onChange).toHaveBeenCalledWith({
      items: [{ name: 'New', url: 'https://' }],
    });
  });
});
