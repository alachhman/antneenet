import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), auth: {} } }));
vi.mock('./supabase', () => ({ supabase: { from: vi.fn(), auth: {} } }));

import { registry, getDefinition, listWidgetTypes } from './widget-registry';

describe('widget registry', () => {
  it('contains all MVP widgets', () => {
    expect(listWidgetTypes().sort()).toEqual(
      ['bookmarks', 'habits', 'stocks', 'tech-feed', 'weather'],
    );
  });

  it('returns undefined for unknown types', () => {
    // @ts-expect-error intentional
    expect(getDefinition('bogus')).toBeUndefined();
  });

  it('every registered definition has required fields', () => {
    for (const def of Object.values(registry)) {
      expect(def.type).toBeTruthy();
      expect(def.displayName).toBeTruthy();
      expect(def.defaultSize.w).toBeGreaterThan(0);
      expect(def.defaultSize.h).toBeGreaterThan(0);
      expect(def.View).toBeDefined();
      expect(def.Settings).toBeDefined();
    }
  });
});
