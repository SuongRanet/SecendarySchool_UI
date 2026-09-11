/** Every route path in one place so links never drift from the router. */
export const ROUTES = {
  login: '/login',
  forgotPassword: '/forgot-password',
  verify: '/verify',

  dashboard: '/dashboard',

  students: '/students',
  studentDetail: (id: number | string) => `/students/${id}`,
  studentCreate: '/students/new',
  studentEdit: (id: number | string) => `/students/${id}/edit`,

  parents: '/parents',
  parentDetail: (id: number | string) => `/parents/${id}`,
  parentCreate: '/parents/new',
  parentEdit: (id: number | string) => `/parents/${id}/edit`,

  teachers: '/teachers',
  teacherDetail: (id: number | string) => `/teachers/${id}`,
  teacherCreate: '/teachers/new',
  teacherEdit: (id: number | string) => `/teachers/${id}/edit`,

  academicYears: '/academic-years',
  gradeLevels: '/grade-levels',
  rooms: '/rooms',
  subjects: '/subjects',

  classes: '/classes',
  classDetail: (id: number | string) => `/classes/${id}`,

  enrollments: '/enrollments',
  schedules: '/schedules',
  attendance: '/attendance',
  assessments: '/assessments',
  assessmentDetail: (id: number | string) => `/assessments/${id}`,
  exams: '/exams',
  grades: '/grades',
  reportCards: '/report-cards',
  reportCardDetail: (id: number | string) => `/report-cards/${id}`,
  assignments: '/assignments',
  behaviors: '/behaviors',
  announcements: '/announcements',
  auditLogs: '/audit-logs',
  settings: '/settings',
  profile: '/profile',

  users: '/users',
  userDetail: (id: number | string) => `/users/${id}`,
  roles: '/roles',

  teacher: {
    dashboard: '/teacher/dashboard',
    classes: '/teacher/classes',
    classDetail: (id: number | string) => `/teacher/classes/${id}`,
    schedule: '/teacher/schedule',
    attendance: '/teacher/attendance',
    assessments: '/teacher/assessments',
    /** Where a teacher actually types the marks for one piece of work. */
    assessmentDetail: (id: number | string) => `/teacher/assessments/${id}`,
    grades: '/teacher/grades',
    assignments: '/teacher/assignments',
    behavior: '/teacher/behavior',
    announcements: '/teacher/announcements',
    /** A homeroom teacher writes the homeroom comment on their own class here. */
    reportCards: '/teacher/report-cards',
    reportCardDetail: (id: number | string) => `/teacher/report-cards/${id}`,
  },

  /**
   * The report card pages are mounted twice: once for the office and once inside
   * the teacher workspace. Links have to stay in whichever workspace the visitor
   * is already in, or a homeroom teacher clicking a pupil lands in the
   * administrator interface.
   */
  reportCardsFor: (pathname: string) => {
    const base = pathname.startsWith('/teacher/')
      ? '/teacher/report-cards'
      : pathname.startsWith('/parent/')
        ? '/parent/report-cards'
        : '/report-cards';

    return { list: base, detail: (id: number | string) => `${base}/${id}` };
  },

  /** The student portal — Grades 7-9 log in here daily, mostly from a phone. */
  student: {
    dashboard: '/student/dashboard',
    schedule: '/student/schedule',
    homework: '/student/homework',
    grades: '/student/grades',
    attendance: '/student/attendance',
    announcements: '/student/announcements',
  },

  parent: {
    dashboard: '/parent/dashboard',
    children: '/parent/children',
    schedule: '/parent/schedule',
    attendance: '/parent/attendance',
    grades: '/parent/grades',
    homework: '/parent/homework',
    behavior: '/parent/behavior',
    reportCards: '/parent/report-cards',
    reportCardDetail: (id: number | string) => `/parent/report-cards/${id}`,
    announcements: '/parent/announcements',
  },
} as const;

/**
 * The profile page inside the signed-in person's own workspace.
 *
 * Every shell has its own profile route. Sending everyone to `ROUTES.profile`
 * dropped teachers, students and guardians into the administrator shell, which
 * is not theirs and, for a student, showed a dashboard they cannot read.
 */
export const profileRouteFor = (roles: string[]): string => {
  if (roles.some((role) => ['TEACHER', 'HOMEROOM_TEACHER'].includes(role))) {
    return '/teacher/profile';
  }

  if (roles.includes('PARENT')) {
    return '/parent/profile';
  }

  if (roles.includes('STUDENT')) {
    return '/student/profile';
  }

  return ROUTES.profile;
};
