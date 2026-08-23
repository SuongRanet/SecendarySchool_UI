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
    grades: '/teacher/grades',
    assignments: '/teacher/assignments',
    behavior: '/teacher/behavior',
    announcements: '/teacher/announcements',
  },

  /** The student portal — Grades 7-9 log in here daily, mostly from a phone. */
  student: {
    dashboard: '/student/dashboard',
    schedule: '/student/schedule',
    homework: '/student/homework',
    grades: '/student/grades',
    attendance: '/student/attendance',
    nationalExam: '/student/national-exam',
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
    announcements: '/parent/announcements',
  },
} as const;
