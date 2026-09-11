import { create } from 'zustand';
import { notificationService } from '@/services/engagement.service';
import type { NotificationType } from '@/types/domain';

/**
 * The unread counts, held once and read from several places.
 *
 * The bell in the top bar and the badges in the sidebar want the same figures,
 * and each polling for itself would put one request per badge on the wire every
 * minute. One poller writes here; everything else subscribes.
 */
interface NotificationState {
  /** Everything unread, which is what the bell shows. */
  count: number;
  /** The same total split by type, which is what a section badge shows. */
  byType: Partial<Record<NotificationType, number>>;
  refresh: () => Promise<void>;
  /** Optimistic decrement after opening one notification. */
  markedOne: (type: NotificationType) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  count: 0,
  byType: {},

  refresh: async () => {
    try {
      const result = await notificationService.unreadCount();
      set({ count: result.count, byType: result.byType ?? {} });
    } catch {
      // A failed poll leaves the previous figures alone. Zeroing them would
      // make a badge flicker away and back on every network hiccup.
    }
  },

  markedOne: (type) =>
    set((state) => ({
      count: Math.max(0, state.count - 1),
      byType: { ...state.byType, [type]: Math.max(0, (state.byType[type] ?? 0) - 1) },
    })),

  clear: () => set({ count: 0, byType: {} }),
}));

/** The unread total across a set of types, for one section's badge. */
export const useUnreadFor = (types: NotificationType[] | undefined): number =>
  useNotificationStore((state) =>
    !types ? 0 : types.reduce((sum, type) => sum + (state.byType[type] ?? 0), 0),
  );
