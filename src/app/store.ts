import { create } from 'zustand';

type EditModeState = {
  editMode: boolean;
  toggle: () => void;
  setEditMode: (v: boolean) => void;
};

export const useEditMode = create<EditModeState>((set) => ({
  editMode: false,
  toggle: () => set((s) => ({ editMode: !s.editMode })),
  setEditMode: (v) => set({ editMode: v }),
}));
