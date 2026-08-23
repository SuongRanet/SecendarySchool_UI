import { api, cleanParams } from './api';
import type { ListQuery, PaginatedData } from '@/types/api';
import type {
  AcademicTerm,
  AcademicYear,
  ClassStudent,
  ClassSubject,
  GradeLevel,
  Room,
  SchoolClass,
  Subject,
} from '@/types/entities';

// ---------------------------------------------------------------------------
// Academic years
// ---------------------------------------------------------------------------

export interface AcademicYearPayload {
  name: string;
  startDate: string;
  endDate: string;
  setActive?: boolean;
}

export const academicYearService = {
  list: (query: ListQuery & { status?: string } = {}): Promise<PaginatedData<AcademicYear>> =>
    api.getPaginated<AcademicYear>('/academic-years', cleanParams(query)),

  options: (): Promise<AcademicYear[]> => api.get<AcademicYear[]>('/academic-years/options'),

  active: (): Promise<AcademicYear | null> => api.get<AcademicYear | null>('/academic-years/active'),

  getById: (id: number): Promise<AcademicYear> => api.get<AcademicYear>(`/academic-years/${id}`),

  create: (payload: AcademicYearPayload): Promise<AcademicYear> =>
    api.post<AcademicYear>('/academic-years', payload),

  update: (id: number, payload: Partial<AcademicYearPayload>): Promise<AcademicYear> =>
    api.patch<AcademicYear>(`/academic-years/${id}`, payload),

  setActive: (id: number): Promise<AcademicYear> =>
    api.post<AcademicYear>(`/academic-years/${id}/activate`),

  close: (id: number): Promise<AcademicYear> =>
    api.post<AcademicYear>(`/academic-years/${id}/close`),

  remove: (id: number): Promise<null> => api.delete<null>(`/academic-years/${id}`),

  listTerms: (id: number): Promise<AcademicTerm[]> =>
    api.get<AcademicTerm[]>(`/academic-years/${id}/terms`),

  createTerm: (
    id: number,
    payload: { name: string; termOrder: number; startDate: string; endDate: string },
  ): Promise<AcademicTerm> => api.post<AcademicTerm>(`/academic-years/${id}/terms`, payload),

  updateTerm: (
    id: number,
    termId: number,
    payload: Partial<{ name: string; termOrder: number; startDate: string; endDate: string }>,
  ): Promise<AcademicTerm> =>
    api.patch<AcademicTerm>(`/academic-years/${id}/terms/${termId}`, payload),

  setActiveTerm: (id: number, termId: number): Promise<AcademicTerm> =>
    api.post<AcademicTerm>(`/academic-years/${id}/terms/${termId}/activate`),

  removeTerm: (id: number, termId: number): Promise<null> =>
    api.delete<null>(`/academic-years/${id}/terms/${termId}`),
};

// ---------------------------------------------------------------------------
// Grade levels
// ---------------------------------------------------------------------------

export interface GradeLevelPayload {
  code: string;
  nameEn: string;
  nameKh?: string | null;
  levelOrder: number;
  description?: string | null;
  isActive?: boolean;
}

export const gradeLevelService = {
  list: (query: { search?: string; isActive?: boolean } = {}): Promise<GradeLevel[]> =>
    api.get<GradeLevel[]>('/grade-levels', cleanParams(query)),

  getById: (id: number): Promise<GradeLevel> => api.get<GradeLevel>(`/grade-levels/${id}`),

  create: (payload: GradeLevelPayload): Promise<GradeLevel> =>
    api.post<GradeLevel>('/grade-levels', payload),

  update: (id: number, payload: Partial<GradeLevelPayload>): Promise<GradeLevel> =>
    api.patch<GradeLevel>(`/grade-levels/${id}`, payload),

  archive: (id: number): Promise<null> => api.delete<null>(`/grade-levels/${id}`),

  reorder: (order: { id: number; levelOrder: number }[]): Promise<GradeLevel[]> =>
    api.put<GradeLevel[]>('/grade-levels/reorder', { order }),
};

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export interface RoomPayload {
  code: string;
  name: string;
  building?: string | null;
  floor?: string | null;
  capacity?: number | null;
  isActive?: boolean;
}

export const roomService = {
  list: (
    query: ListQuery & { building?: string; isActive?: boolean } = {},
  ): Promise<PaginatedData<Room>> => api.getPaginated<Room>('/rooms', cleanParams(query)),

  options: (): Promise<Room[]> => api.get<Room[]>('/rooms/options'),

  getById: (id: number): Promise<Room> => api.get<Room>(`/rooms/${id}`),

  create: (payload: RoomPayload): Promise<Room> => api.post<Room>('/rooms', payload),

  update: (id: number, payload: Partial<RoomPayload>): Promise<Room> =>
    api.patch<Room>(`/rooms/${id}`, payload),

  archive: (id: number): Promise<null> => api.delete<null>(`/rooms/${id}`),
};

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export interface SubjectPayload {
  code: string;
  nameEn: string;
  nameKh?: string | null;
  description?: string | null;
  isActive?: boolean;
  gradeLevelIds?: number[];
}

export const subjectService = {
  list: (
    query: ListQuery & { isActive?: boolean; gradeLevelId?: number } = {},
  ): Promise<PaginatedData<Subject>> => api.getPaginated<Subject>('/subjects', cleanParams(query)),

  options: (query: { gradeLevelId?: number } = {}): Promise<Subject[]> =>
    api.get<Subject[]>('/subjects/options', cleanParams(query)),

  getById: (id: number): Promise<Subject> => api.get<Subject>(`/subjects/${id}`),

  create: (payload: SubjectPayload): Promise<Subject> => api.post<Subject>('/subjects', payload),

  update: (id: number, payload: Partial<SubjectPayload>): Promise<Subject> =>
    api.patch<Subject>(`/subjects/${id}`, payload),

  setActive: (id: number, isActive: boolean): Promise<Subject> =>
    api.patch<Subject>(`/subjects/${id}/status`, { isActive }),

  archive: (id: number): Promise<null> => api.delete<null>(`/subjects/${id}`),
};

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export interface ClassPayload {
  academicYearId: number;
  gradeLevelId: number;
  code: string;
  name: string;
  homeroomTeacherId?: number | null;
  roomId?: number | null;
  capacity?: number;
  description?: string | null;
  isActive?: boolean;
  subjects?: { subjectId: number; teacherId?: number | null; weight?: number }[];
}

export interface ClassListQuery extends ListQuery {
  academicYearId?: number;
  gradeLevelId?: number;
  homeroomTeacherId?: number;
  teacherId?: number;
  isActive?: boolean;
}

export const classService = {
  list: (query: ClassListQuery = {}): Promise<PaginatedData<SchoolClass>> =>
    api.getPaginated<SchoolClass>('/classes', cleanParams(query)),

  options: (query: ClassListQuery = {}): Promise<SchoolClass[]> =>
    api.get<SchoolClass[]>('/classes/options', cleanParams(query)),

  getById: (id: number): Promise<SchoolClass> => api.get<SchoolClass>(`/classes/${id}`),

  create: (payload: ClassPayload): Promise<SchoolClass> => api.post<SchoolClass>('/classes', payload),

  update: (
    id: number,
    payload: Partial<Omit<ClassPayload, 'academicYearId' | 'subjects'>>,
  ): Promise<SchoolClass> => api.patch<SchoolClass>(`/classes/${id}`, payload),

  archive: (id: number): Promise<null> => api.delete<null>(`/classes/${id}`),

  listSubjects: (id: number): Promise<ClassSubject[]> =>
    api.get<ClassSubject[]>(`/classes/${id}/subjects`),

  assignSubject: (
    id: number,
    payload: { subjectId: number; teacherId?: number | null; weight?: number; isActive?: boolean },
  ): Promise<ClassSubject> => api.post<ClassSubject>(`/classes/${id}/subjects`, payload),

  replaceSubjects: (
    id: number,
    subjects: { subjectId: number; teacherId?: number | null; weight?: number }[],
  ): Promise<ClassSubject[]> => api.put<ClassSubject[]>(`/classes/${id}/subjects`, { subjects }),

  removeSubject: (id: number, classSubjectId: number): Promise<null> =>
    api.delete<null>(`/classes/${id}/subjects/${classSubjectId}`),

  listStudents: (id: number, includeInactive = false): Promise<ClassStudent[]> =>
    api.get<ClassStudent[]>(`/classes/${id}/students`, cleanParams({ includeInactive })),
};
