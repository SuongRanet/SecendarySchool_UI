import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  NotebookPen,
  DoorOpen,
  FileBadge,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Layers,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UserSquare2,
  UsersRound,
} from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import type { NotificationType } from '@/types/domain';

export interface NavItem {
  key: string;
  /** Translation key inside the `navigation` namespace. */
  labelKey: string;
  to: string;
  icon: LucideIcon;
  /** The user needs at least one of these permissions to see the item. */
  permissions?: string[];
  /**
   * Unread notification types this item counts.
   *
   * The badge answers "is there something here for me" without opening the
   * page: homework handed in, for a teacher; homework set or marked, for a
   * pupil. It clears as those notifications are read.
   */
  badgeTypes?: NotificationType[];
  end?: boolean;
}

export interface NavSection {
  key: string;
  labelKey: string;
  items: NavItem[];
}

export const ADMIN_NAVIGATION: NavSection[] = [
  {
    key: 'overview',
    labelKey: 'sections.overview',
    items: [
      {
        key: 'dashboard',
        labelKey: 'items.dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    key: 'people',
    labelKey: 'sections.people',
    items: [
      {
        key: 'students',
        labelKey: 'items.students',
        to: '/students',
        icon: GraduationCap,
        permissions: [PERMISSIONS.STUDENTS_VIEW],
      },
      {
        key: 'parents',
        labelKey: 'items.parents',
        to: '/parents',
        icon: UsersRound,
        permissions: [PERMISSIONS.PARENTS_VIEW],
      },
      {
        key: 'teachers',
        labelKey: 'items.teachers',
        to: '/teachers',
        icon: UserSquare2,
        permissions: [PERMISSIONS.TEACHERS_VIEW],
      },
    ],
  },
  {
    key: 'academics',
    labelKey: 'sections.academics',
    items: [
      {
        key: 'academicYears',
        labelKey: 'items.academicYears',
        to: '/academic-years',
        icon: CalendarRange,
        permissions: [PERMISSIONS.ACADEMIC_YEARS_VIEW],
      },
      {
        key: 'gradeLevels',
        labelKey: 'items.gradeLevels',
        to: '/grade-levels',
        icon: Layers,
        permissions: [PERMISSIONS.GRADE_LEVELS_VIEW],
      },
      {
        key: 'classes',
        labelKey: 'items.classes',
        to: '/classes',
        icon: Users,
        permissions: [PERMISSIONS.CLASSES_VIEW],
      },
      {
        key: 'subjects',
        labelKey: 'items.subjects',
        to: '/subjects',
        icon: BookOpen,
        permissions: [PERMISSIONS.SUBJECTS_VIEW],
      },
      {
        key: 'rooms',
        labelKey: 'items.rooms',
        to: '/rooms',
        icon: DoorOpen,
        permissions: [PERMISSIONS.ROOMS_VIEW],
      },
      {
        key: 'enrollments',
        labelKey: 'items.enrollments',
        to: '/enrollments',
        icon: ClipboardList,
        permissions: [PERMISSIONS.ENROLLMENTS_VIEW],
      },
    ],
  },
  {
    key: 'operations',
    labelKey: 'sections.operations',
    items: [
      {
        key: 'schedules',
        labelKey: 'items.schedules',
        to: '/schedules',
        icon: CalendarDays,
        permissions: [PERMISSIONS.SCHEDULES_VIEW],
      },
      {
        key: 'attendance',
        labelKey: 'items.attendance',
        to: '/attendance',
        icon: ClipboardCheck,
        permissions: [PERMISSIONS.ATTENDANCE_VIEW],
      },
    ],
  },
  {
    key: 'performance',
    labelKey: 'sections.performance',
    items: [
      {
        key: 'exams',
        labelKey: 'items.exams',
        to: '/exams',
        icon: FileBadge,
        permissions: [PERMISSIONS.EXAMS_VIEW],
      },
      {
        key: 'assessments',
        labelKey: 'items.assessments',
        to: '/assessments',
        icon: NotebookPen,
        permissions: [PERMISSIONS.ASSESSMENTS_VIEW],
      },
      {
        key: 'grades',
        labelKey: 'items.grades',
        to: '/grades',
        icon: BarChart3,
        permissions: [PERMISSIONS.GRADES_VIEW],
      },
      {
        key: 'reportCards',
        labelKey: 'items.reportCards',
        to: '/report-cards',
        icon: ScrollText,
        permissions: [PERMISSIONS.REPORT_CARDS_VIEW],
      },
      {
        key: 'assignments',
        labelKey: 'items.assignments',
        to: '/assignments',
        icon: ClipboardList,
        permissions: [PERMISSIONS.ASSIGNMENTS_VIEW],
      },
      {
        key: 'behaviors',
        labelKey: 'items.behaviors',
        to: '/behaviors',
        icon: Heart,
        permissions: [PERMISSIONS.BEHAVIORS_VIEW],
      },
    ],
  },
  {
    key: 'communication',
    labelKey: 'sections.communication',
    items: [
      {
        key: 'announcements',
        labelKey: 'items.announcements',
        to: '/announcements',
        icon: Megaphone,
        permissions: [PERMISSIONS.ANNOUNCEMENTS_VIEW],
      },
    ],
  },
  {
    key: 'system',
    labelKey: 'sections.system',
    items: [
      {
        key: 'users',
        labelKey: 'items.users',
        to: '/users',
        icon: Users,
        permissions: [PERMISSIONS.USERS_VIEW],
      },
      {
        key: 'roles',
        labelKey: 'items.roles',
        to: '/roles',
        icon: ShieldCheck,
        permissions: [PERMISSIONS.ROLES_VIEW],
      },
      {
        key: 'auditLogs',
        labelKey: 'items.auditLogs',
        to: '/audit-logs',
        icon: ScrollText,
        permissions: [PERMISSIONS.AUDIT_LOGS_VIEW],
      },
      {
        key: 'settings',
        labelKey: 'items.settings',
        to: '/settings',
        icon: Settings,
        permissions: [PERMISSIONS.SETTINGS_MANAGE],
      },
    ],
  },
];

export const TEACHER_NAVIGATION: NavSection[] = [
  {
    key: 'overview',
    labelKey: 'sections.overview',
    items: [
      {
        key: 'dashboard',
        labelKey: 'items.dashboard',
        to: '/teacher/dashboard',
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    key: 'myClasses',
    labelKey: 'sections.myClasses',
    items: [
      { key: 'classes', labelKey: 'items.myClasses', to: '/teacher/classes', icon: Users },
      { key: 'schedule', labelKey: 'items.mySchedule', to: '/teacher/schedule', icon: CalendarDays },
      {
        key: 'attendance',
        labelKey: 'items.attendance',
        to: '/teacher/attendance',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    key: 'performance',
    labelKey: 'sections.performance',
    items: [
      {
        key: 'assessments',
        labelKey: 'items.assessments',
        to: '/teacher/assessments',
        icon: NotebookPen,
      },
      { key: 'grades', labelKey: 'items.grades', to: '/teacher/grades', icon: BarChart3 },
      {
        key: 'assignments',
        labelKey: 'items.assignments',
        to: '/teacher/assignments',
        icon: ClipboardList,
        badgeTypes: ['HOMEWORK_SUBMITTED'],
      },
      {
        key: 'reportCards',
        labelKey: 'items.reportCards',
        to: '/teacher/report-cards',
        icon: FileBadge,
      },
      { key: 'behaviors', labelKey: 'items.behaviors', to: '/teacher/behavior', icon: Heart },
    ],
  },
  {
    key: 'communication',
    labelKey: 'sections.communication',
    items: [
      {
        key: 'announcements',
        labelKey: 'items.announcements',
        to: '/teacher/announcements',
        icon: Megaphone,
      },
    ],
  },
];

export const PARENT_NAVIGATION: NavSection[] = [
  {
    key: 'overview',
    labelKey: 'sections.overview',
    items: [
      {
        key: 'dashboard',
        labelKey: 'items.dashboard',
        to: '/parent/dashboard',
        icon: LayoutDashboard,
        end: true,
      },
      {
        key: 'children',
        labelKey: 'items.myChildren',
        to: '/parent/children',
        icon: GraduationCap,
      },
    ],
  },
  {
    key: 'academics',
    labelKey: 'sections.academics',
    items: [
      { key: 'schedule', labelKey: 'items.schedules', to: '/parent/schedule', icon: CalendarDays },
      {
        key: 'attendance',
        labelKey: 'items.attendance',
        to: '/parent/attendance',
        icon: ClipboardCheck,
      },
      { key: 'grades', labelKey: 'items.grades', to: '/parent/grades', icon: BarChart3 },
      {
        key: 'homework',
        labelKey: 'items.assignments',
        to: '/parent/homework',
        icon: ClipboardList,
        badgeTypes: ['NEW_ASSIGNMENT'],
      },
      { key: 'behavior', labelKey: 'items.behaviors', to: '/parent/behavior', icon: Heart },
      {
        key: 'reportCards',
        labelKey: 'items.reportCards',
        to: '/parent/report-cards',
        icon: ScrollText,
      },
    ],
  },
  {
    key: 'communication',
    labelKey: 'sections.communication',
    items: [
      {
        key: 'announcements',
        labelKey: 'items.announcements',
        to: '/parent/announcements',
        icon: Megaphone,
      },
    ],
  },
];

/**
 * The student portal, for Grades 7-9.
 *
 * Kept deliberately short: a student opens this on a phone between lessons, so
 * the menu answers "what do I have, what do I owe, how am I doing" and little
 * else. The national examination entry only appears for a student who holds the
 * permission, which in practice means a Grade 9 candidate.
 */
export const STUDENT_NAVIGATION: NavSection[] = [
  {
    key: 'overview',
    labelKey: 'sections.overview',
    items: [
      {
        key: 'dashboard',
        labelKey: 'items.dashboard',
        to: '/student/dashboard',
        icon: LayoutDashboard,
        end: true,
      },
      { key: 'schedule', labelKey: 'items.mySchedule', to: '/student/schedule', icon: CalendarDays },
    ],
  },
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
      { key: 'grades', labelKey: 'items.grades', to: '/student/grades', icon: BarChart3 },
      {
        key: 'attendance',
        labelKey: 'items.attendance',
        to: '/student/attendance',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    key: 'communication',
    labelKey: 'sections.communication',
    items: [
      {
        key: 'announcements',
        labelKey: 'items.announcements',
        to: '/student/announcements',
        icon: Megaphone,
      },
    ],
  },
];

/** Drops the items a user has no permission for, then drops empty sections. */
export const filterNavigation = (
  sections: NavSection[],
  hasPermission: (...permissions: string[]) => boolean,
): NavSection[] =>
  sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.permissions || hasPermission(...item.permissions),
      ),
    }))
    .filter((section) => section.items.length > 0);
