import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ClipboardList, LayoutDashboard } from 'lucide-react';
import { renderWithProviders } from '@/test/render';
import { useNotificationStore } from '@/stores/notification.store';
import type { NavSection } from '@/app/navigation';
import { Sidebar } from '../Sidebar';

/**
 * The badge on a sidebar entry answers "is there something here for me" without
 * opening the page: work handed in, for a teacher; work set or marked, for a
 * pupil.
 *
 * It counts only the types the entry declares. A teacher with two unread
 * announcements and no submissions must see no badge on Homework, or the badge
 * stops meaning anything and starts being ignored.
 */
const SECTIONS: NavSection[] = [
  {
    key: 'overview',
    labelKey: 'sections.overview',
    items: [
      { key: 'dashboard', labelKey: 'items.dashboard', to: '/dashboard', icon: LayoutDashboard },
      {
        key: 'assignments',
        labelKey: 'items.assignments',
        to: '/teacher/assignments',
        icon: ClipboardList,
        badgeTypes: ['HOMEWORK_SUBMITTED'],
      },
    ],
  },
];

const renderSidebar = () =>
  renderWithProviders(<Sidebar sections={SECTIONS} open={false} onClose={() => {}} />);

describe('sidebar notification badge', () => {
  beforeEach(() => {
    useNotificationStore.setState({ count: 0, byType: {} });
  });

  it('shows nothing when there is nothing unread', () => {
    renderSidebar();

    expect(screen.queryAllByText('2')).toHaveLength(0);
  });

  it('counts the unread notifications of the types the entry declares', () => {
    useNotificationStore.setState({ count: 2, byType: { HOMEWORK_SUBMITTED: 2 } });

    renderSidebar();

    // The sidebar renders twice — the fixed desktop rail and the mobile
    // drawer — so the badge legitimately appears once in each.
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('ignores unread notifications of other types', () => {
    // Two announcements are unread, but none of them is homework.
    useNotificationStore.setState({ count: 2, byType: { ANNOUNCEMENT: 2 } });

    renderSidebar();

    expect(screen.queryAllByText('2')).toHaveLength(0);
  });

  it('sums the types an entry declares, for a pupil watching work set and marked', () => {
    useNotificationStore.setState({
      count: 5,
      byType: { NEW_ASSIGNMENT: 3, HOMEWORK_GRADED: 1, ANNOUNCEMENT: 1 },
    });

    renderWithProviders(
      <Sidebar
        sections={[
          {
            key: 'academics',
            labelKey: 'sections.academics',
            items: [
              {
                key: 'homework',
                labelKey: 'items.assignments',
                to: '/student/homework',
                icon: ClipboardList,
                badgeTypes: ['NEW_ASSIGNMENT', 'HOMEWORK_GRADED'],
              },
            ],
          },
        ]}
        open={false}
        onClose={() => {}}
      />,
    );

    // Three set plus one marked; the announcement is not homework.
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    // The announcement must not be swept into the homework badge.
    expect(screen.queryAllByText('5')).toHaveLength(0);
  });
});
