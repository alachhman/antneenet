import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WidgetCard } from './WidgetCard';
import { useEditMode } from './store';

describe('<WidgetCard>', () => {
  it('renders children inside a raised card', () => {
    useEditMode.setState({ editMode: false });
    render(<WidgetCard instanceId="i1" onGear={() => {}}>hello</WidgetCard>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('shows gear button in edit mode', () => {
    useEditMode.setState({ editMode: true });
    render(<WidgetCard instanceId="i1" onGear={() => {}}>x</WidgetCard>);
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  it('hides gear button outside edit mode', () => {
    useEditMode.setState({ editMode: false });
    render(<WidgetCard instanceId="i1" onGear={() => {}}>x</WidgetCard>);
    expect(screen.queryByRole('button', { name: /settings/i })).toBeNull();
  });
});
