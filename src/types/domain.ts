/**
 * Domain enumerations and shared record shapes. These mirror the PostgreSQL enums
 * and the DTOs the backend returns.
 */

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ROLE_CODES = [
  'SUPER_ADMIN',
  'ADMIN',
  'PRINCIPAL',
  'TEACHER',
  'HOMEROOM_TEACHER',
  'PARENT',
  'STUDENT',
] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export type Gender = (typeof GENDERS)[number];

export const STUDENT_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'TRANSFERRED',
  'GRADUATED',
  'WITHDRAWN',
] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const STAFF_STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RESIGNED'] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const ACADEMIC_YEAR_STATUSES = ['UPCOMING', 'ACTIVE', 'CLOSED'] as const;
export type AcademicYearStatus = (typeof ACADEMIC_YEAR_STATUSES)[number];

export const ENROLLMENT_STATUSES = [
  'ACTIVE',
  'COMPLETED',
  'TRANSFERRED',
  'WITHDRAWN',
  'PROMOTED',
] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const GUARDIAN_RELATIONSHIPS = [
  'FATHER',
  'MOTHER',
  'GRANDFATHER',
  'GRANDMOTHER',
  'UNCLE',
  'AUNT',
  'SIBLING',
  'LEGAL_GUARDIAN',
  'OTHER',
] as const;
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];

export const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'LEAVE'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/**
 * Every assessment type the database can hold.
 *
 * HOMEWORK is still here because three hundred and forty of them exist, they
 * carry ten per cent of every subject grade, and the mark a teacher gives on the
 * Homework page reaches the gradebook through one. It is simply no longer a
 * thing anybody creates by hand — see CREATABLE_ASSESSMENT_TYPES.
 *
 * ASSIGNMENT, PROJECT and PARTICIPATION were never used by the school and have
 * been dropped. The labels remain in the PostgreSQL enum because a value cannot
 * be removed from one without rewriting every column that uses it, and an unused
 * label costs nothing — the same decision taken for MOCK_NATIONAL in migration
 * 015. Nothing can produce them any more.
 */
export const ASSESSMENT_TYPES = ['HOMEWORK', 'QUIZ', 'MIDTERM', 'FINAL'] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

/**
 * The types a person may choose when setting a new piece of work.
 *
 * The school assesses on quizzes, the midterm and the final. Homework is set
 * through the Homework page, which creates its own assessment behind the
 * scenes, so offering it here would let a teacher create a second, unlinked one.
 */
export const CREATABLE_ASSESSMENT_TYPES = ['QUIZ', 'MIDTERM', 'FINAL'] as const;
export type CreatableAssessmentType = (typeof CREATABLE_ASSESSMENT_TYPES)[number];

export const EXAM_TYPES = ['QUIZ', 'MONTHLY_TEST', 'MIDTERM', 'FINAL'] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export const PERFORMANCE_LEVELS = ['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_IMPROVEMENT'] as const;
export type PerformanceLevel = (typeof PERFORMANCE_LEVELS)[number];

export const BEHAVIOR_TYPES = [
  'ACHIEVEMENT',
  'POSITIVE',
  'PARTICIPATION',
  'TEAMWORK',
  'RESPONSIBILITY',
  'COMMUNICATION',
  'WARNING',
  'DISCIPLINARY',
] as const;
export type BehaviorType = (typeof BEHAVIOR_TYPES)[number];

export const ANNOUNCEMENT_AUDIENCES = [
  'ALL',
  'TEACHERS',
  'PARENTS',
  'STUDENTS',
  'GRADE',
  'CLASS',
] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const ANNOUNCEMENT_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

/**
 * The statuses worth filtering a list by.
 *
 * A record can hold any status in the full list above, and the badge on each row
 * still shows whichever it is. These narrower lists only decide what the filter
 * drop-down offers: the school asked to be able to narrow to what has been
 * released and what has been withdrawn, which are the two questions actually
 * asked of a finished list.
 */
export const ANNOUNCEMENT_FILTER_STATUSES = ['PUBLISHED', 'ARCHIVED'] as const;

export const NOTIFICATION_TYPES = [
  'ANNOUNCEMENT',
  'ATTENDANCE_ALERT',
  'NEW_ASSIGNMENT',
  'HOMEWORK_SUBMITTED',
  'HOMEWORK_GRADED',
  'NEW_GRADE',
  'UPCOMING_EXAM',
  'PAYMENT_REMINDER',
  'SYSTEM',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ASSIGNMENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_FILTER_STATUSES = ['PUBLISHED', 'ARCHIVED'] as const;

export const SUBMISSION_STATUSES = ['PENDING', 'SUBMITTED', 'LATE', 'GRADED', 'MISSING'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const REPORT_CARD_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type ReportCardStatus = (typeof REPORT_CARD_STATUSES)[number];

export const REPORT_CARD_FILTER_STATUSES = ['PUBLISHED', 'ARCHIVED'] as const;

export type ProfileType = 'TEACHER' | 'STUDENT' | 'PARENT';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export interface AuthProfile {
  id: number;
  username: string;
  email: string;
  status: UserStatus;
  roles: RoleCode[];
  permissions: string[];
  fullName: string | null;
  profileType: ProfileType | null;
  /** The school code this person is known by: STU-…, TCH-… or PAR-…. */
  profileCode: string | null;
  teacherId: number | null;
  studentId: number | null;
  parentId: number | null;
  lastLoginAt: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResult {
  user: AuthProfile;
  tokens: AuthTokens;
}

export interface User {
  id: number;
  username: string;
  email: string;
  status: UserStatus;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  roles: RoleCode[];
  fullName: string | null;
  profileType: ProfileType | null;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: number;
  code: RoleCode;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
  description: string | null;
}

export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}
