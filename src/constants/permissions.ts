/**
 * Permission codes, mirrored from the backend.
 *
 * These drive what the interface offers. The backend re-checks every one of them,
 * so a missing permission here hides a control but never grants access.
 */
export const PERMISSIONS = {
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DISABLE: 'users.disable',
  USERS_RESET_PASSWORD: 'users.reset_password',
  USERS_ASSIGN_ROLES: 'users.assign_roles',

  ROLES_VIEW: 'roles.view',
  ROLES_MANAGE: 'roles.manage',

  STUDENTS_VIEW: 'students.view',
  STUDENTS_VIEW_OWN: 'students.view_own',
  STUDENTS_CREATE: 'students.create',
  STUDENTS_UPDATE: 'students.update',
  STUDENTS_ARCHIVE: 'students.archive',

  PARENTS_VIEW: 'parents.view',
  PARENTS_CREATE: 'parents.create',
  PARENTS_UPDATE: 'parents.update',
  PARENTS_ARCHIVE: 'parents.archive',
  PARENTS_LINK_STUDENTS: 'parents.link_students',

  TEACHERS_VIEW: 'teachers.view',
  TEACHERS_CREATE: 'teachers.create',
  TEACHERS_UPDATE: 'teachers.update',
  TEACHERS_ARCHIVE: 'teachers.archive',
  TEACHERS_ASSIGN: 'teachers.assign',

  ACADEMIC_YEARS_VIEW: 'academic_years.view',
  ACADEMIC_YEARS_MANAGE: 'academic_years.manage',
  ACADEMIC_YEARS_CLOSE: 'academic_years.close',

  GRADE_LEVELS_VIEW: 'grade_levels.view',
  GRADE_LEVELS_MANAGE: 'grade_levels.manage',

  CLASSES_VIEW: 'classes.view',
  CLASSES_MANAGE: 'classes.manage',

  SUBJECTS_VIEW: 'subjects.view',
  SUBJECTS_MANAGE: 'subjects.manage',

  ROOMS_VIEW: 'rooms.view',
  ROOMS_MANAGE: 'rooms.manage',

  ENROLLMENTS_VIEW: 'enrollments.view',
  ENROLLMENTS_MANAGE: 'enrollments.manage',

  SCHEDULES_VIEW: 'schedules.view',
  SCHEDULES_MANAGE: 'schedules.manage',

  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_RECORD: 'attendance.record',
  ATTENDANCE_UPDATE_ANY: 'attendance.update_any',

  ASSESSMENTS_VIEW: 'assessments.view',
  ASSESSMENTS_MANAGE: 'assessments.manage',
  ASSESSMENTS_GRADE: 'assessments.grade',

  EXAMS_VIEW: 'exams.view',
  EXAMS_MANAGE: 'exams.manage',

  GRADES_VIEW: 'grades.view',
  GRADES_ENTER: 'grades.enter',
  GRADES_UPDATE_ANY: 'grades.update_any',

  REPORT_CARDS_VIEW: 'report_cards.view',
  REPORT_CARDS_GENERATE: 'report_cards.generate',
  REPORT_CARDS_PUBLISH: 'report_cards.publish',

  ASSIGNMENTS_VIEW: 'assignments.view',
  ASSIGNMENTS_MANAGE: 'assignments.manage',
  ASSIGNMENTS_GRADE: 'assignments.grade',

  BEHAVIORS_VIEW: 'behaviors.view',
  BEHAVIORS_MANAGE: 'behaviors.manage',

  ANNOUNCEMENTS_VIEW: 'announcements.view',
  ANNOUNCEMENTS_MANAGE: 'announcements.manage',
  ANNOUNCEMENTS_PUBLISH: 'announcements.publish',

  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_SEND: 'notifications.send',

  DASHBOARD_ADMIN: 'dashboard.admin',
  DASHBOARD_PRINCIPAL: 'dashboard.principal',
  DASHBOARD_TEACHER: 'dashboard.teacher',
  DASHBOARD_PARENT: 'dashboard.parent',
  NATIONAL_EXAMS_VIEW: 'national_exams.view',
  NATIONAL_EXAMS_MANAGE: 'national_exams.manage',
  NATIONAL_EXAMS_PUBLISH: 'national_exams.publish',
  ASSIGNMENTS_SUBMIT: 'assignments.submit',

  DASHBOARD_STUDENT: 'dashboard.student',

  REPORTS_VIEW: 'reports.view',
  AUDIT_LOGS_VIEW: 'audit_logs.view',

  SETTINGS_MANAGE: 'settings.manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
