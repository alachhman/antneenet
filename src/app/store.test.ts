import { describe, it, expect, beforeEach } from 'vitest';
import { useEditMode } from './store';

describe('useEditMode', () => {
  beforeEach(() => {
    useEditMode.setState({ editMode: false });
  });

  it('defaults to false', () => {
    expect(useEditMode.getState().editMode).toBe(false);
  });

  it('toggle flips the flag', () => {
    useEditMode.getState().toggle();
    expect(useEditMode.getState().editMode).toBe(true);
    useEditMode.getState().toggle();
    expect(useEditMode.getState().editMode).toBe(false);
  });

  it('setEditMode sets explicitly', () => {
    useEditMode.getState().setEditMode(true);
    expect(useEditMode.getState().editMode).toBe(true);
  });
});
