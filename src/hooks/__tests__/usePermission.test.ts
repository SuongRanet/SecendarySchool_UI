import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@/constants/permissions';
import { buildProfile, signIn, signOut } from '@/test/render';
import { usePermission } from '../usePermission';

describe('usePermission', () => {
  afterEach(signOut);

  it('reports no permissions when nobody is signed in', () => {
    signOut();
    const { result } = renderHook(() => usePermission());

    expect(result.current.user).toBeNull();
    expect(result.current.has(PERMISSIONS.STUDENTS_VIEW)).toBe(false);
    expect(result.current.hasRole('ADMIN')).toBe(false);
    expect(result.current.isElevated()).toBe(false);
  });

  it('has() is true when any one of the listed permissions is held', () => {
    signIn(buildProfile({ permissions: [PERMISSIONS.STUDENTS_VIEW] }));
    const { result } = renderHook(() => usePermission());

    expect(result.current.has(PERMISSIONS.TEACHERS_VIEW, PERMISSIONS.STUDENTS_VIEW)).toBe(true);
    expect(result.current.has(PERMISSIONS.TEACHERS_VIEW)).toBe(false);
  });

  it('hasAll() requires every listed permission', () => {
    signIn(buildProfile({ permissions: [PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.CLASSES_VIEW] }));
    const { result } = renderHook(() => usePermission());

    expect(result.current.hasAll(PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.CLASSES_VIEW)).toBe(true);
    expect(result.current.hasAll(PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.TEACHERS_VIEW)).toBe(false);
  });

  it('hasRole() matches any of the listed roles', () => {
    signIn(buildProfile({ roles: ['TEACHER'] }));
    const { result } = renderHook(() => usePermission());

    expect(result.current.hasRole('TEACHER', 'PARENT')).toBe(true);
    expect(result.current.hasRole('PARENT')).toBe(false);
  });

  it.each(['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL'] as const)('isElevated() is true for %s', (role) => {
    signIn(buildProfile({ roles: [role] }));
    const { result } = renderHook(() => usePermission());

    expect(result.current.isElevated()).toBe(true);
  });

  it.each(['TEACHER', 'PARENT', 'STUDENT', 'ACCOUNTANT'] as const)(
    'isElevated() is false for %s',
    (role) => {
      signIn(buildProfile({ roles: [role] }));
      const { result } = renderHook(() => usePermission());

      expect(result.current.isElevated()).toBe(false);
    },
  );
});
