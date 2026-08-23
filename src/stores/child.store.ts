import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SelectedChildState {
  /** The child a guardian is currently looking at across the parent portal. */
  studentId: number | null;
  setStudentId: (studentId: number | null) => void;
}

/**
 * A guardian with several children switches between them without signing out, so
 * the choice lives in a small persisted store rather than in each page.
 */
export const useSelectedChildStore = create<SelectedChildState>()(
  persist(
    (set) => ({
      studentId: null,
      setStudentId: (studentId) => set({ studentId }),
    }),
    { name: 'sms.selectedChild' },
  ),
);
