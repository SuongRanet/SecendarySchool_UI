import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@/constants/permissions';
import {
  ADMIN_NAVIGATION,
  PARENT_NAVIGATION,
  TEACHER_NAVIGATION,
  filterNavigation,
} from '../navigation';
import type { NavSection } from '../navigation';

const allItems = (sections: NavSection[]) => sections.flatMap((section) => section.items);

const grants =
  (...granted: string[]) =>
  (...required: string[]) =>
    required.some((permission) => granted.includes(permission));

describe('filterNavigation', () => {
  it('hides every permission-gated item from a user with no permissions', () => {
    const filtered = filterNavigation(ADMIN_NAVIGATION, () => false);
    const remaining = allItems(filtered);

    expect(remaining.every((item) => !item.permissions)).toBe(true);
  });

  it('keeps an item once its permission is granted', () => {
    const filtered = filterNavigation(
      ADMIN_NAVIGATION,
      grants(PERMISSIONS.STUDENTS_VIEW),
    );

    expect(allItems(filtered).map((item) => item.key)).toContain('students');
    expect(allItems(filtered).map((item) => item.key)).not.toContain('teachers');
  });

  it('drops a section once all of its items are hidden', () => {
    const filtered = filterNavigation(ADMIN_NAVIGATION, () => false);

    expect(filtered.every((section) => section.items.length > 0)).toBe(true);
    expect(filtered.map((section) => section.key)).not.toContain('people');
  });

  it('keeps a section when only one of its items survives', () => {
    const filtered = filterNavigation(ADMIN_NAVIGATION, grants(PERMISSIONS.TEACHERS_VIEW));
    const people = filtered.find((section) => section.key === 'people');

    expect(people?.items.map((item) => item.key)).toEqual(['teachers']);
  });

  it('always keeps items that need no permission, such as the dashboard', () => {
    const filtered = filterNavigation(ADMIN_NAVIGATION, () => false);

    expect(allItems(filtered).map((item) => item.key)).toContain('dashboard');
  });

  it('shows the whole admin menu to a user who holds every permission', () => {
    const filtered = filterNavigation(ADMIN_NAVIGATION, () => true);

    expect(allItems(filtered)).toHaveLength(allItems(ADMIN_NAVIGATION).length);
    expect(filtered).toHaveLength(ADMIN_NAVIGATION.length);
  });

  it('does not mutate the source navigation', () => {
    const before = allItems(ADMIN_NAVIGATION).length;
    filterNavigation(ADMIN_NAVIGATION, () => false);

    expect(allItems(ADMIN_NAVIGATION)).toHaveLength(before);
  });
});

describe('navigation tables', () => {
  it.each([
    ['admin', ADMIN_NAVIGATION],
    ['teacher', TEACHER_NAVIGATION],
    ['parent', PARENT_NAVIGATION],
  ])('the %s menu has unique keys and absolute routes', (_name, sections) => {
    const items = allItems(sections);
    const keys = items.map((item) => item.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(items.every((item) => item.to.startsWith('/'))).toBe(true);
  });

  it('the teacher and parent menus point at their own route trees', () => {
    expect(
      allItems(TEACHER_NAVIGATION).every((item) => item.to.startsWith('/teacher')),
    ).toBe(true);
    expect(allItems(PARENT_NAVIGATION).every((item) => item.to.startsWith('/parent'))).toBe(true);
  });
});
