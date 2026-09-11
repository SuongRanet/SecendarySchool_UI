import { useTranslation } from 'react-i18next';
import { Badge } from './Badge';
import type { BadgeTone } from './Badge';
import type {
  AcademicYearStatus,
  AnnouncementStatus,
  AssignmentStatus,
  AttendanceStatus,
  EnrollmentStatus,
  PerformanceLevel,
  ReportCardStatus,
  StaffStatus,
  StudentStatus,
  SubmissionStatus,
  UserStatus,
} from '@/types/domain';

/**
 * Consistent colour language for every status in the system, so the same state
 * always reads the same way on any page.
 */
const USER_TONES: Record<UserStatus, BadgeTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  SUSPENDED: 'danger',
  PENDING_VERIFICATION: 'warning',
};

const STUDENT_TONES: Record<StudentStatus, BadgeTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  TRANSFERRED: 'info',
  GRADUATED: 'primary',
  WITHDRAWN: 'danger',
};

const STAFF_TONES: Record<StaffStatus, BadgeTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  ON_LEAVE: 'warning',
  RESIGNED: 'danger',
};

const YEAR_TONES: Record<AcademicYearStatus, BadgeTone> = {
  UPCOMING: 'info',
  ACTIVE: 'success',
  CLOSED: 'neutral',
};

const ENROLLMENT_TONES: Record<EnrollmentStatus, BadgeTone> = {
  ACTIVE: 'success',
  COMPLETED: 'neutral',
  TRANSFERRED: 'info',
  WITHDRAWN: 'danger',
  PROMOTED: 'primary',
};

const ATTENDANCE_TONES: Record<AttendanceStatus, BadgeTone> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  LATE: 'warning',
  EXCUSED: 'info',
  LEAVE: 'accent',
};

const ANNOUNCEMENT_TONES: Record<AnnouncementStatus, BadgeTone> = {
  DRAFT: 'neutral',
  SCHEDULED: 'info',
  PUBLISHED: 'success',
  ARCHIVED: 'neutral',
};

const ASSIGNMENT_TONES: Record<AssignmentStatus, BadgeTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  CLOSED: 'warning',
  ARCHIVED: 'neutral',
};

const SUBMISSION_TONES: Record<SubmissionStatus, BadgeTone> = {
  PENDING: 'neutral',
  SUBMITTED: 'info',
  LATE: 'warning',
  GRADED: 'success',
  MISSING: 'danger',
};

const REPORT_CARD_TONES: Record<ReportCardStatus, BadgeTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'neutral',
};

const PERFORMANCE_TONES: Record<PerformanceLevel, BadgeTone> = {
  EXCELLENT: 'success',
  GOOD: 'primary',
  FAIR: 'warning',
  NEEDS_IMPROVEMENT: 'danger',
};

export type StatusKind =
  | 'user'
  | 'student'
  | 'staff'
  | 'academicYear'
  | 'enrollment'
  | 'attendance'
  | 'announcement'
  | 'assignment'
  | 'submission'
  | 'reportCard'
  | 'performance';

const TONE_MAPS: Record<StatusKind, Record<string, BadgeTone>> = {
  user: USER_TONES,
  student: STUDENT_TONES,
  staff: STAFF_TONES,
  academicYear: YEAR_TONES,
  enrollment: ENROLLMENT_TONES,
  attendance: ATTENDANCE_TONES,
  announcement: ANNOUNCEMENT_TONES,
  assignment: ASSIGNMENT_TONES,
  submission: SUBMISSION_TONES,
  reportCard: REPORT_CARD_TONES,
  performance: PERFORMANCE_TONES,
};

/** Where each status kind finds its label in the translation files. */
const LABEL_KEYS: Record<StatusKind, (status: string) => string> = {
  user: (status) => `users:status.${status}`,
  student: (status) => `students:status.${status}`,
  staff: (status) => `teachers:status.${status}`,
  academicYear: (status) => `academics:academicYears.status.${status}`,
  enrollment: (status) => `students:enrollmentStatus.${status}`,
  attendance: (status) => `attendance:status.${status}`,
  announcement: (status) => `communication:announcementStatus.${status}`,
  assignment: (status) => `communication:assignmentStatus.${status}`,
  submission: (status) => `communication:submissionStatus.${status}`,
  reportCard: (status) => `performance:reportCardStatus.${status}`,
  performance: (status) => `performance:performanceLevel.${status}`,
};

export interface StatusBadgeProps {
  kind: StatusKind;
  status: string | null | undefined;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const StatusBadge = ({ kind, status, size = 'md', dot = true }: StatusBadgeProps) => {
  const { t } = useTranslation([
    'users',
    'students',
    'teachers',
    'academics',
    'attendance',
    'communication',
    'performance',
  ]);

  if (!status) {
    return <span className="text-[var(--text-subtle)]">—</span>;
  }

  const tone = TONE_MAPS[kind][status] ?? 'neutral';
  const key = LABEL_KEYS[kind](status);
  const label = t(key, { defaultValue: status.replace(/_/g, ' ') });

  return (
    <Badge tone={tone} size={size} dot={dot}>
      {label}
    </Badge>
  );
};
