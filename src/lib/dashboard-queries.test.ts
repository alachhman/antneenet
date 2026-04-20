import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultLayoutsFor } from './dashboard-queries';

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {},
  },
}));

describe('defaultLayoutsFor', () => {
  beforeEach(() => {});

  it('produces a grid item for each instance in each breakpoint', () => {
    const layouts = defaultLayoutsFor([
      { id: 'a', widget_type: 'demo', config: {}, created_at: '' },
      { id: 'b', widget_type: 'demo', config: {}, created_at: '' },
    ], { demo: { w: 3, h: 2 } });
    expect(layouts.lg.length).toBe(2);
    expect(layouts.xs.length).toBe(2);
    expect(layouts.lg[0].i).toBe('a');
  });

  it('stacks widgets on xs with w=2', () => {
    const layouts = defaultLayoutsFor([
      { id: 'a', widget_type: 'demo', config: {}, created_at: '' },
    ], { demo: { w: 3, h: 2 } });
    expect(layouts.xs[0].w).toBe(2);
  });
});
