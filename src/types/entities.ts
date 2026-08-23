/**
 * Entity shapes returned by the API. These mirror the backend DTOs one-for-one so
 * a change on the server surfaces here as a type error rather than at runtime.
 */
import type {
  AcademicYearStatus,
  AnnouncementAudience,
  AnnouncementStatus,
  AssessmentType,
  AssignmentStatus,
  AttendanceStatus,
  BehaviorType,
  EnrollmentStatus,
  ExamType,
  Gender,
  GuardianRelationship,
  NotificationType,
  PerformanceLevel,
  ReportCardStatus,
  StaffStatus,
  StudentStatus,
  SubmissionStatus,
  Weekday,
} from './domain';

// ---------------------------------------------------------------------------
// Academic structure
// ---------------------------------------------------------------------------

export interface AcademicYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  isActive: boolean;
  closedAt: string | null;
  classCount: number;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicTerm {
  id: number;
  academicYearId: number;
  name: string;
  termOrder: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface GradeLevel {
  id: number;
  code: string;
  nameEn: string;
  nameKh: string | null;
  levelOrder: number;
  description: string | null;
  isActive: boolean;
  classCount: number;
  studentCount: number;
}

export interface Room {
  id: number;
  code: string;
  name: string;
  building: string | null;
  floor: string | null;
  capacity: number | null;
  isActive: boolean;
  scheduleCount: number;
}

export interface Subject {
  id: number;
  code: string;
  nameEn: string;
  nameKh: string | null;
  description: string | null;
  isActive: boolean;
  gradeLevelIds: number[];
  classCount: number;
  teacherCount: number;
}

export interface SchoolClass {
  id: number;
  academicYearId: number;
  academicYearName: string;
  academicYearStatus: AcademicYearStatus;
  gradeLevelId: number;
  gradeLevelName: string;
  gradeLevelOrder: number;
  homeroomTeacherId: number | null;
  homeroomTeacherName: string | null;
  roomId: number | null;
  roomName: string | null;
  code: string;
  name: string;
  capacity: number;
  description: string | null;
  isActive: boolean;
  enrolledCount: number;
  availableSeats: number;
  subjectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSubject {
  id: number;
  classId: number;
  subjectId: number;
  subjectCode: string;
  subjectNameEn: string;
  subjectNameKh: string | null;
  teacherId: number | null;
  teacherName: string | null;
  weight: number;
  isActive: boolean;
  assessmentCount: number;
}

export interface ClassStudent {
  enrollmentId: number;
  studentId: number;
  studentCode: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameKh: string | null;
  lastNameKh: string | null;
  fullName: string;
  gender: Gender | null;
  dateOfBirth: string | null;
  profilePhoto: string | null;
  studentStatus: StudentStatus;
  enrollmentStatus: EnrollmentStatus;
  rollNumber: string | null;
  enrolledDate: string;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface Teacher {
  id: number;
  userId: number | null;
  username: string | null;
  teacherCode: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameKh: string | null;
  lastNameKh: string | null;
  fullName: string;
  gender: Gender | null;
  dateOfBirth: string | null;
  nationalId: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  qualification: string | null;
  specialization: string | null;
  hireDate: string | null;
  status: StaffStatus;
  profilePhoto: string | null;
  notes: string | null;
  subjectIds: number[];
  homeroomClassIds: number[];
  classCount: number;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAssignment {
  classSubjectId: number;
  classId: number;
  className: string;
  classCode: string;
  academicYearId: number;
  academicYearName: string;
  gradeLevelId: number;
  gradeLevelName: string;
  subjectId: number;
  subjectName: string;
  isHomeroom: boolean;
  studentCount: number;
}

export interface Student {
  id: number;
  userId: number | null;
  username: string | null;
  studentCode: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameKh: string | null;
  lastNameKh: string | null;
  fullName: string;
  fullNameKh: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  nationalId: string | null;
  phoneNumber: string | null;
  email: string | null;
  currentAddress: string | null;
  province: string | null;
  profilePhoto: string | null;
  enrolledDate: string | null;
  status: StudentStatus;
  notes: string | null;
  currentEnrollment: {
    enrollmentId: number;
    classId: number;
    className: string;
    gradeLevelId: number;
    gradeLevelName: string;
    academicYearId: number;
    academicYearName: string;
  } | null;
  parentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentParent {
  linkId: number;
  parentId: number;
  parentCode: string;
  fullName: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameKh: string | null;
  lastNameKh: string | null;
  phoneNumber: string | null;
  email: string | null;
  occupation: string | null;
  profilePhoto: string | null;
  relationship: GuardianRelationship;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  canPickUp: boolean;
}

export interface Parent {
  id: number;
  userId: number | null;
  username: string | null;
  parentCode: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameKh: string | null;
  lastNameKh: string | null;
  fullName: string;
  gender: Gender | null;
  dateOfBirth: string | null;
  nationalId: string | null;
  phoneNumber: string | null;
  alternatePhone: string | null;
  email: string | null;
  occupation: string | null;
  workplace: string | null;
  address: string | null;
  province: string | null;
  profilePhoto: string | null;
  isActive: boolean;
  childrenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParentChild {
  linkId: number;
  studentId: number;
  studentCode: string;
  firstNameEn: string;
  lastNameEn: string;
  fullName: string;
  fullNameKh: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  profilePhoto: string | null;
  status: StudentStatus;
  relationship: GuardianRelationship;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  canPickUp: boolean;
  currentClassId: number | null;
  currentClassName: string | null;
  currentGradeLevelName: string | null;
  currentAcademicYearId: number | null;
  currentAcademicYearName: string | null;
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

export interface Enrollment {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  studentPhoto: string | null;
  academicYearId: number;
  academicYearName: string;
  classId: number;
  className: string;
  classCode: string;
  gradeLevelId: number;
  gradeLevelName: string;
  rollNumber: string | null;
  enrolledDate: string;
  endDate: string | null;
  status: EnrollmentStatus;
  transferredFrom: number | null;
  remarks: string | null;
  createdAt: string;
}

export interface StudentEnrollmentHistory {
  id: number;
  academicYearId: number;
  academicYearName: string;
  classId: number;
  className: string;
  gradeLevelId: number;
  gradeLevelName: string;
  homeroomTeacherName: string | null;
  rollNumber: string | null;
  enrolledDate: string;
  endDate: string | null;
  status: EnrollmentStatus;
  remarks: string | null;
}

// ---------------------------------------------------------------------------
// Scheduling and attendance
// ---------------------------------------------------------------------------

export interface Schedule {
  id: number;
  academicYearId: number;
  academicYearName: string;
  classId: number;
  className: string;
  classCode: string;
  gradeLevelName: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  teacherId: number | null;
  teacherName: string | null;
  roomId: number | null;
  roomName: string | null;
  dayOfWeek: Weekday;
  periodNumber: number | null;
  startTime: string;
  endTime: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface ScheduleConflict {
  kind: 'TEACHER' | 'CLASS' | 'ROOM';
  scheduleId: number;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  className: string;
  subjectName: string;
  teacherName: string | null;
  roomName: string | null;
  message: string;
}

export interface AttendanceRecord {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  studentPhoto: string | null;
  classId: number;
  className: string;
  academicYearId: number;
  subjectId: number | null;
  subjectName: string | null;
  attendanceDate: string;
  periodNumber: number | null;
  status: AttendanceStatus;
  reasonId: number | null;
  reasonName: string | null;
  note: string | null;
  minutesLate: number | null;
  recordedBy: number | null;
  recordedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceReason {
  id: number;
  code: string;
  nameEn: string;
  nameKh: string | null;
  appliesTo: AttendanceStatus | null;
  isExcused: boolean;
  isActive: boolean;
}

export interface AttendanceSheetStudent {
  studentId: number;
  studentCode: string;
  fullName: string;
  fullNameKh: string | null;
  profilePhoto: string | null;
  rollNumber: string | null;
  enrollmentId: number;
  attendance: {
    id: number;
    status: AttendanceStatus;
    reasonId: number | null;
    note: string | null;
    minutesLate: number | null;
  } | null;
}

export interface AttendanceSheet {
  classId: number;
  className: string;
  academicYearId: number;
  attendanceDate: string;
  periodNumber: number | null;
  isRecorded: boolean;
  recordedAt: string | null;
  students: AttendanceSheetStudent[];
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  leave: number;
  totalRecords: number;
  attendanceRate: number;
}

export interface StudentAttendanceSummary extends AttendanceSummary {
  studentId: number;
  studentCode: string;
  studentName: string;
}

export interface ClassAttendanceSummary extends AttendanceSummary {
  classId: number;
  className: string;
  studentCount: number;
}

export interface DailyAttendancePoint {
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  leave: number;
}

export interface TodayAttendanceOverview extends AttendanceSummary {
  expected: number;
  notRecorded: number;
}

export interface PendingAttendanceClass {
  classId: number;
  className: string;
  studentCount: number;
}

// ---------------------------------------------------------------------------
// Academic performance
// ---------------------------------------------------------------------------

export interface Assessment {
  id: number;
  academicYearId: number;
  academicYearName: string;
  termId: number | null;
  termName: string | null;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  teacherId: number | null;
  teacherName: string | null;
  title: string;
  description: string | null;
  type: AssessmentType;
  maxScore: number;
  weightPercent: number | null;
  assessmentDate: string | null;
  isPublished: boolean;
  gradedCount: number;
  studentCount: number;
  averageScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentResult {
  id: number | null;
  assessmentId: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  studentNameKh: string | null;
  profilePhoto: string | null;
  rollNumber: string | null;
  score: number | null;
  percentage: number | null;
  isAbsent: boolean;
  feedback: string | null;
  gradedAt: string | null;
}

export interface AssessmentStatistics {
  assessmentId: number;
  maxScore: number;
  gradedCount: number;
  studentCount: number;
  averageScore: number | null;
  averagePercent: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  passCount: number;
  failCount: number;
  absentCount: number;
}

export interface Exam {
  id: number;
  academicYearId: number;
  academicYearName: string;
  termId: number | null;
  termName: string | null;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  roomId: number | null;
  roomName: string | null;
  title: string;
  type: ExamType;
  examDate: string;
  startTime: string | null;
  durationMinutes: number | null;
  maxScore: number;
  instructions: string | null;
  gradedCount: number;
  studentCount: number;
  averageScore: number | null;
  createdAt: string;
}

export interface ExamResult {
  id: number | null;
  examId: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  rollNumber: string | null;
  score: number | null;
  percentage: number | null;
  isAbsent: boolean;
  remark: string | null;
  gradedAt: string | null;
}

export interface Grade {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  academicYearId: number;
  academicYearName: string;
  termId: number | null;
  termName: string | null;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  letterGrade: string | null;
  performance: PerformanceLevel | null;
  gpaPoint: number | null;
  rankInClass: number | null;
  teacherComment: string | null;
  isFinal: boolean;
  calculatedAt: string | null;
  updatedAt: string;
}

export interface CalculatedGrade {
  studentId: number;
  studentCode: string;
  studentName: string;
  componentBreakdown: {
    assessmentType: AssessmentType;
    weightPercent: number;
    earned: number;
    possible: number;
    percent: number | null;
    weighted: number | null;
  }[];
  percentage: number | null;
  letterGrade: string | null;
  performance: PerformanceLevel | null;
  gpaPoint: number | null;
}

export interface GradingScheme {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  components: { assessmentType: AssessmentType; weightPercent: number }[];
  scales: {
    letterGrade: string;
    minScore: number;
    maxScore: number;
    gpaPoint: number | null;
    performance: PerformanceLevel;
    remark: string | null;
  }[];
}

export interface GradeHistoryEntry {
  id: number;
  gradeId: number;
  oldScore: number | null;
  newScore: number | null;
  oldLetter: string | null;
  newLetter: string | null;
  reason: string | null;
  changedBy: number | null;
  changedByName: string | null;
  createdAt: string;
}

export interface ReportCardSubject {
  subjectId: number;
  subjectName: string;
  subjectNameKh: string | null;
  subjectCode: string;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  letterGrade: string | null;
  performance: PerformanceLevel | null;
  rankInClass: number | null;
  comment: string | null;
}

export interface ReportCard {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  studentNameKh: string | null;
  studentPhoto: string | null;
  dateOfBirth: string | null;
  academicYearId: number;
  academicYearName: string;
  termId: number | null;
  termName: string | null;
  classId: number;
  className: string;
  gradeLevelName: string;
  homeroomTeacherName: string | null;
  totalScore: number | null;
  averageScore: number | null;
  gpa: number | null;
  letterGrade: string | null;
  performance: PerformanceLevel | null;
  rankInClass: number | null;
  classSize: number | null;
  attendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    percent: number | null;
  };
  teacherComment: string | null;
  homeroomComment: string | null;
  principalComment: string | null;
  status: ReportCardStatus;
  generatedAt: string | null;
  publishedAt: string | null;
  subjects: ReportCardSubject[];
}

export type ReportCardSummary = Omit<ReportCard, 'subjects'>;

// ---------------------------------------------------------------------------
// Homework and behavior
// ---------------------------------------------------------------------------

export interface Assignment {
  id: number;
  academicYearId: number;
  termId: number | null;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  teacherId: number | null;
  teacherName: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  attachmentUrl: string | null;
  assignedDate: string;
  dueDate: string;
  maxScore: number | null;
  status: AssignmentStatus;
  isOverdue: boolean;
  submissionCount: number;
  studentCount: number;
  gradedCount: number;
  mySubmission: {
    status: SubmissionStatus;
    score: number | null;
    feedback: string | null;
  } | null;
  createdAt: string;
}

export interface Submission {
  id: number | null;
  assignmentId: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  rollNumber: string | null;
  status: SubmissionStatus;
  content: string | null;
  attachmentUrl: string | null;
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

export interface Behavior {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  academicYearId: number;
  classId: number | null;
  className: string | null;
  teacherId: number | null;
  teacherName: string | null;
  type: BehaviorType;
  title: string;
  description: string | null;
  occurredOn: string;
  points: number;
  actionTaken: string | null;
  visibleToParent: boolean;
  createdAt: string;
}

export interface BehaviorSummary {
  positive: number;
  warnings: number;
  disciplinary: number;
  totalPoints: number;
  byType: { type: BehaviorType; count: number }[];
}

export interface StudentComment {
  id: number;
  studentId: number;
  academicYearId: number;
  termId: number | null;
  termName: string | null;
  classId: number | null;
  subjectId: number | null;
  subjectName: string | null;
  teacherId: number | null;
  teacherName: string | null;
  isHomeroom: boolean;
  comment: string;
  visibleToParent: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Communication
// ---------------------------------------------------------------------------

export interface Announcement {
  id: number;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  gradeLevelId: number | null;
  gradeLevelName: string | null;
  classId: number | null;
  className: string | null;
  status: AnnouncementStatus;
  isPinned: boolean;
  publishAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  attachmentUrl: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: number;
  recipientId: number;
  type: NotificationType;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: number | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Insight
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: number;
  userId: number | null;
  username: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface EnrollmentByGrade {
  gradeLevelId: number;
  gradeLevelName: string;
  count: number;
}

export interface ClassDistribution {
  classId: number;
  className: string;
  count: number;
  capacity: number;
}

export interface AdminDashboard {
  academicYear: { id: number; name: string; startDate: string; endDate: string };
  counts: {
    totalStudents: number;
    totalTeachers: number;
    totalParents: number;
    totalClasses: number;
    totalSubjects: number;
    activeEnrollments: number;
  };
  attendanceToday: TodayAttendanceOverview;
  enrollmentByGrade: EnrollmentByGrade[];
  classDistribution: ClassDistribution[];
  studentStatus: { status: string; count: number }[];
  gender: { gender: string; count: number }[];
  announcements: {
    id: number;
    title: string;
    audience: string;
    publishedAt: string | null;
    isPinned: boolean;
  }[];
  upcomingExams: Exam[];
}

export interface PrincipalDashboard {
  academicYear: { id: number; name: string };
  counts: AdminDashboard['counts'];
  attendanceToday: TodayAttendanceOverview;
  performance: {
    average: number | null;
    excellent: number;
    good: number;
    fair: number;
    needsImprovement: number;
  };
  classAverages: {
    classId: number;
    className: string;
    average: number | null;
    studentCount: number;
  }[];
  teacherWorkload: {
    teacherId: number;
    teacherName: string;
    classCount: number;
    periodCount: number;
  }[];
  enrollmentByGrade: EnrollmentByGrade[];
  attendanceTrend: DailyAttendancePoint[];
}

export interface TeacherDashboard {
  academicYear: { id: number; name: string };
  counts: { classCount: number; studentCount: number; subjectCount: number };
  todaySchedule: Schedule[];
  myClasses: SchoolClass[];
  pendingAttendance: PendingAttendanceClass[];
  pendingGrading: Assessment[];
  upcomingExams: Exam[];
}

export interface ChildSummary {
  attendancePercent: number | null;
  averageScore: number | null;
  pendingAssignments: number;
  unreadNotifications: number;
}

export interface ParentDashboard {
  academicYear: { id: number; name: string };
  children: (ParentChild & { summary: ChildSummary })[];
  announcements: AdminDashboard['announcements'];
}

export interface StudentDashboard {
  academicYear: { id: number; name: string };
  summary: ChildSummary;
  schedule: Schedule[];
  grades: Grade[];
  attendance: StudentAttendanceSummary;
  announcements: AdminDashboard['announcements'];
}

// ---------------------------------------------------------------------------
// Grade 9 national examination (Diplôme)
// ---------------------------------------------------------------------------

export type NationalExamRegStatus =
  | 'NOT_REGISTERED'
  | 'REGISTERED'
  | 'ADMITTED'
  | 'SAT'
  | 'ABSENT'
  | 'RESULT_PUBLISHED';

export type NationalExamGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface NationalExamSession {
  id: number;
  academicYearId: number;
  academicYearName: string | null;
  name: string;
  centreName: string | null;
  centreCode: string | null;
  startsOn: string;
  endsOn: string;
  registrationDeadline: string | null;
  isOpen: boolean;
  notes: string | null;
  registeredCount: number;
  resultCount: number;
  passCount: number;
  passRate: number | null;
}

export interface NationalExamSubjectScore {
  subjectId: number;
  subjectCode: string | null;
  subjectName: string | null;
  subjectNameKh: string | null;
  score: number;
  maxScore: number;
}

export interface NationalExamResult {
  id: number;
  registrationId: number;
  resultGrade: NationalExamGrade;
  totalScore: number | null;
  isPass: boolean;
  publishedOn: string;
  amendmentReason: string | null;
  supersededAt: string | null;
  subjectScores: NationalExamSubjectScore[];
}

export interface NationalExamRegistration {
  id: number;
  sessionId: number;
  sessionName: string | null;
  centreName: string | null;
  startsOn: string | null;
  endsOn: string | null;
  academicYearId: number | null;
  academicYearName: string | null;
  studentId: number;
  studentCode: string | null;
  studentName: string | null;
  studentNameKh: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  enrollmentId: number;
  classId: number | null;
  className: string | null;
  seatNumber: string | null;
  attempt: number;
  status: NationalExamRegStatus;
  remarks: string | null;
  result: {
    resultGrade: NationalExamGrade;
    totalScore: number | null;
    isPass: boolean;
    publishedOn: string;
  } | null;
}

export interface NationalExamStatistics {
  sessionId: number;
  registered: number;
  sat: number;
  absent: number;
  published: number;
  passed: number;
  failed: number;
  passRate: number | null;
  byClass: {
    classId: number;
    className: string;
    registered: number;
    published: number;
    passed: number;
    passRate: number | null;
  }[];
  byGrade: { resultGrade: NationalExamGrade; count: number }[];
}
