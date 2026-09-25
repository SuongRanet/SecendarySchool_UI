import { api, cleanParams } from './api';
import type { ListQuery, PaginatedData } from '@/types/api';
import type {
  Enrollment,
  Parent,
  ParentChild,
  Student,
  StudentEnrollmentHistory,
  StudentParent,
  Teacher,
  TeacherAssignment,
} from '@/types/entities';
import type {
  Gender,
  GuardianRelationship,
  StaffStatus,
  StudentStatus,
  EnrollmentStatus,
} from '@/types/domain';
import type { Schedule } from '@/types/entities';

export interface AccountPayload {
  username: string;
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------------

export interface TeacherPayload {
  teacherCode?: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameKh?: string | null;
  lastNameKh?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  hireDate?: string | null;
  status?: StaffStatus;
  profilePhoto?: string | null;
  notes?: string | null;
  subjectIds?: number[];
  account?: AccountPayload & { isHomeroomTeacher?: boolean };
}

export interface TeacherListQuery extends ListQuery {
  includeArchived?: boolean;
  unassigned?: boolean;
  status?: StaffStatus;
  subjectId?: number;
  classId?: number;
  hasAccount?: boolean;
}

/** Sends a profile photo as multipart form data under the `photo` field. */
const photoForm = (file: File): FormData => {
  const form = new FormData();
  form.append('photo', file);

  return form;
};

// Let the browser set the multipart boundary, and allow for a slow phone upload.
const PHOTO_REQUEST = { headers: { 'Content-Type': undefined }, timeout: 120_000 };

export const teacherService = {
  list: (query: TeacherListQuery = {}): Promise<PaginatedData<Teacher>> =>
    api.getPaginated<Teacher>('/teachers', cleanParams(query)),

  options: (query: { subjectId?: number } = {}): Promise<Teacher[]> =>
    api.get<Teacher[]>('/teachers/options', cleanParams(query)),

  me: (): Promise<Teacher> => api.get<Teacher>('/teachers/me'),

  getById: (id: number): Promise<Teacher> => api.get<Teacher>(`/teachers/${id}`),

  create: (payload: TeacherPayload): Promise<Teacher> => api.post<Teacher>('/teachers', payload),

  update: (id: number, payload: Partial<Omit<TeacherPayload, 'account'>>): Promise<Teacher> =>
    api.patch<Teacher>(`/teachers/${id}`, payload),

  archive: (id: number): Promise<null> => api.delete<null>(`/teachers/${id}`),

  restore: (id: number): Promise<Teacher> => api.post<Teacher>(`/teachers/${id}/restore`),

  uploadPhoto: (id: number, file: File): Promise<Teacher> =>
    api.put<Teacher>(`/teachers/${id}/photo`, photoForm(file), PHOTO_REQUEST),

  removePhoto: (id: number): Promise<Teacher> => api.delete<Teacher>(`/teachers/${id}/photo`),

  assignSubjects: (id: number, subjectIds: number[]): Promise<Teacher> =>
    api.put<Teacher>(`/teachers/${id}/subjects`, { subjectIds }),

  myAssignments: (academicYearId?: number): Promise<TeacherAssignment[]> =>
    api.get<TeacherAssignment[]>('/teachers/me/assignments', cleanParams({ academicYearId })),

  mySchedule: (academicYearId?: number): Promise<Schedule[]> =>
    api.get<Schedule[]>('/teachers/me/schedule', cleanParams({ academicYearId })),

  assignments: (id: number, academicYearId?: number): Promise<TeacherAssignment[]> =>
    api.get<TeacherAssignment[]>(`/teachers/${id}/assignments`, cleanParams({ academicYearId })),

  schedule: (id: number, academicYearId?: number): Promise<Schedule[]> =>
    api.get<Schedule[]>(`/teachers/${id}/schedule`, cleanParams({ academicYearId })),

  createAccount: (
    id: number,
    payload: AccountPayload & { isHomeroomTeacher?: boolean },
  ): Promise<Teacher> => api.post<Teacher>(`/teachers/${id}/account`, payload),
};

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export interface StudentPayload {
  studentCode?: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameKh?: string | null;
  lastNameKh?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  nationalId?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  currentAddress?: string | null;
  province?: string | null;
  profilePhoto?: string | null;
  enrolledDate?: string | null;
  status?: StudentStatus;
  notes?: string | null;
  enrollment?: {
    academicYearId: number;
    classId: number;
    rollNumber?: string | null;
    enrolledDate?: string;
  };
  parents?: {
    parentId: number;
    relationship?: GuardianRelationship;
    isPrimaryContact?: boolean;
    isEmergencyContact?: boolean;
  }[];
  account?: AccountPayload;
}

export interface StudentListQuery extends ListQuery {
  status?: StudentStatus;
  gender?: Gender;
  gradeLevelId?: number;
  classId?: number;
  academicYearId?: number;
  parentId?: number;
  includeArchived?: boolean;
  /** Only students who belong to no class, so they can be found and enrolled. */
  unassigned?: boolean;
}

export const studentService = {
  list: (query: StudentListQuery = {}): Promise<PaginatedData<Student>> =>
    api.getPaginated<Student>('/students', cleanParams(query)),

  getById: (id: number): Promise<Student> => api.get<Student>(`/students/${id}`),

  create: (payload: StudentPayload): Promise<Student> => api.post<Student>('/students', payload),

  update: (
    id: number,
    payload: Partial<Omit<StudentPayload, 'enrollment' | 'parents' | 'account'>>,
  ): Promise<Student> => api.patch<Student>(`/students/${id}`, payload),

  archive: (id: number): Promise<null> => api.delete<null>(`/students/${id}`),

  restore: (id: number): Promise<Student> => api.post<Student>(`/students/${id}/restore`),

  uploadPhoto: (id: number, file: File): Promise<Student> =>
    api.put<Student>(`/students/${id}/photo`, photoForm(file), PHOTO_REQUEST),

  removePhoto: (id: number): Promise<Student> => api.delete<Student>(`/students/${id}/photo`),

  listParents: (id: number): Promise<StudentParent[]> =>
    api.get<StudentParent[]>(`/students/${id}/parents`),

  linkParent: (
    id: number,
    payload: {
      parentId: number;
      relationship?: GuardianRelationship;
      isPrimaryContact?: boolean;
      isEmergencyContact?: boolean;
      canPickUp?: boolean;
    },
  ): Promise<StudentParent[]> => api.post<StudentParent[]>(`/students/${id}/parents`, payload),

  unlinkParent: (id: number, parentId: number): Promise<null> =>
    api.delete<null>(`/students/${id}/parents/${parentId}`),

  enrollmentHistory: (id: number): Promise<StudentEnrollmentHistory[]> =>
    api.get<StudentEnrollmentHistory[]>(`/students/${id}/enrollments`),

  currentEnrollment: (id: number): Promise<Enrollment | null> =>
    api.get<Enrollment | null>(`/students/${id}/enrollments/current`),

  createAccount: (id: number, payload: AccountPayload): Promise<Student> =>
    api.post<Student>(`/students/${id}/account`, payload),

  statusBreakdown: (): Promise<{ status: string; count: number }[]> =>
    api.get<{ status: string; count: number }[]>('/students/stats/status'),
};

// ---------------------------------------------------------------------------
// Parents
// ---------------------------------------------------------------------------

export interface ParentPayload {
  parentCode?: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameKh?: string | null;
  lastNameKh?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  phoneNumber?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  occupation?: string | null;
  workplace?: string | null;
  address?: string | null;
  province?: string | null;
  profilePhoto?: string | null;
  isActive?: boolean;
  children?: {
    studentId: number;
    relationship?: GuardianRelationship;
    isPrimaryContact?: boolean;
    isEmergencyContact?: boolean;
  }[];
  account?: AccountPayload;
}

export interface ParentListQuery extends ListQuery {
  includeArchived?: boolean;
  isActive?: boolean;
  studentId?: number;
  hasAccount?: boolean;
}

export const parentService = {
  list: (query: ParentListQuery = {}): Promise<PaginatedData<Parent>> =>
    api.getPaginated<Parent>('/parents', cleanParams(query)),

  options: (query: { search?: string } = {}): Promise<Parent[]> =>
    api.get<Parent[]>('/parents/options', cleanParams(query)),

  me: (): Promise<Parent> => api.get<Parent>('/parents/me'),

  myChildren: (): Promise<ParentChild[]> => api.get<ParentChild[]>('/parents/me/children'),

  getById: (id: number): Promise<Parent> => api.get<Parent>(`/parents/${id}`),

  create: (payload: ParentPayload): Promise<Parent> => api.post<Parent>('/parents', payload),

  update: (
    id: number,
    payload: Partial<Omit<ParentPayload, 'children' | 'account'>>,
  ): Promise<Parent> => api.patch<Parent>(`/parents/${id}`, payload),

  archive: (id: number): Promise<null> => api.delete<null>(`/parents/${id}`),

  restore: (id: number): Promise<Parent> => api.post<Parent>(`/parents/${id}/restore`),

  listChildren: (id: number): Promise<ParentChild[]> =>
    api.get<ParentChild[]>(`/parents/${id}/children`),

  linkChild: (
    id: number,
    payload: {
      studentId: number;
      relationship?: GuardianRelationship;
      isPrimaryContact?: boolean;
      isEmergencyContact?: boolean;
      canPickUp?: boolean;
    },
  ): Promise<ParentChild[]> => api.post<ParentChild[]>(`/parents/${id}/children`, payload),

  unlinkChild: (id: number, studentId: number): Promise<null> =>
    api.delete<null>(`/parents/${id}/children/${studentId}`),

  createAccount: (id: number, payload: AccountPayload): Promise<Parent> =>
    api.post<Parent>(`/parents/${id}/account`, payload),
};

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

export interface EnrollmentListQuery extends ListQuery {
  academicYearId?: number;
  classId?: number;
  gradeLevelId?: number;
  studentId?: number;
  status?: EnrollmentStatus;
}

export const enrollmentService = {
  list: (query: EnrollmentListQuery = {}): Promise<PaginatedData<Enrollment>> =>
    api.getPaginated<Enrollment>('/enrollments', cleanParams(query)),

  getById: (id: number): Promise<Enrollment> => api.get<Enrollment>(`/enrollments/${id}`),

  create: (payload: {
    studentId: number;
    academicYearId: number;
    classId: number;
    rollNumber?: string | null;
    enrolledDate?: string;
    remarks?: string | null;
  }): Promise<Enrollment> => api.post<Enrollment>('/enrollments', payload),

  update: (
    id: number,
    payload: { rollNumber?: string | null; remarks?: string | null },
  ): Promise<Enrollment> => api.patch<Enrollment>(`/enrollments/${id}`, payload),

  transfer: (
    id: number,
    payload: {
      classId: number;
      effectiveDate?: string;
      rollNumber?: string | null;
      remarks?: string | null;
    },
  ): Promise<Enrollment> => api.post<Enrollment>(`/enrollments/${id}/transfer`, payload),

  withdraw: (
    id: number,
    payload: {
      endDate?: string | null;
      status?: 'WITHDRAWN' | 'TRANSFERRED' | 'COMPLETED';
      remarks?: string | null;
    },
  ): Promise<Enrollment> => api.post<Enrollment>(`/enrollments/${id}/withdraw`, payload),

  promote: (payload: {
    fromAcademicYearId: number;
    toAcademicYearId: number;
    classMapping: { fromClassId: number; toClassId: number }[];
    excludeStudentIds?: number[];
    enrolledDate?: string | null;
  }): Promise<{ promoted: number; skipped: number }> =>
    api.post<{ promoted: number; skipped: number }>('/enrollments/promote', payload),

  /**
   * Ends the school career of the exit grade. The server decides who that is
   * from `grade_levels.is_exit_grade`, so no class list is sent.
   */
  graduate: (payload: {
    academicYearId: number;
    excludeStudentIds?: number[];
  }): Promise<{ graduated: number; skipped: number; classes: string[] }> =>
    api.post('/enrollments/graduate', payload),

  statsByGrade: (
    academicYearId: number,
  ): Promise<{ gradeLevelId: number; gradeLevelName: string; count: number }[]> =>
    api.get('/enrollments/stats/by-grade', { academicYearId }),

  statsByClass: (
    academicYearId: number,
  ): Promise<{ classId: number; className: string; count: number; capacity: number }[]> =>
    api.get('/enrollments/stats/by-class', { academicYearId }),
};
