import { api, cleanParams } from './api';
import type { ListQuery, PaginatedData } from '@/types/api';
import type { AssessmentType, ExamType, PerformanceLevel } from '@/types/domain';
import type {
  Assessment,
  AssessmentResult,
  AssessmentStatistics,
  CalculatedGrade,
  Exam,
  ExamResult,
  Grade,
  GradeHistoryEntry,
  GradingScheme,
  ReportCard,
  ReportCardSummary,
} from '@/types/entities';

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

export interface AssessmentPayload {
  classId: number;
  subjectId: number;
  termId?: number | null;
  teacherId?: number | null;
  title: string;
  description?: string | null;
  type: AssessmentType;
  maxScore: number;
  weightPercent?: number | null;
  assessmentDate?: string | null;
  isPublished?: boolean;
}

export interface AssessmentListQuery extends ListQuery {
  academicYearId?: number;
  termId?: number;
  classId?: number;
  subjectId?: number;
  teacherId?: number;
  type?: AssessmentType;
  isPublished?: boolean;
}

export const assessmentService = {
  list: (query: AssessmentListQuery = {}): Promise<PaginatedData<Assessment>> =>
    api.getPaginated<Assessment>('/assessments', cleanParams(query)),

  pendingGrading: (): Promise<Assessment[]> =>
    api.get<Assessment[]>('/assessments/pending-grading'),

  getById: (id: number): Promise<Assessment> => api.get<Assessment>(`/assessments/${id}`),

  create: (payload: AssessmentPayload): Promise<Assessment> =>
    api.post<Assessment>('/assessments', payload),

  update: (
    id: number,
    payload: Partial<Omit<AssessmentPayload, 'classId' | 'subjectId'>>,
  ): Promise<Assessment> => api.patch<Assessment>(`/assessments/${id}`, payload),

  setPublished: (id: number, isPublished: boolean): Promise<Assessment> =>
    api.patch<Assessment>(`/assessments/${id}/publish`, { isPublished }),

  archive: (id: number): Promise<null> => api.delete<null>(`/assessments/${id}`),

  listResults: (id: number): Promise<AssessmentResult[]> =>
    api.get<AssessmentResult[]>(`/assessments/${id}/results`),

  saveResults: (
    id: number,
    results: { studentId: number; score?: number | null; isAbsent?: boolean; feedback?: string | null }[],
  ): Promise<AssessmentResult[]> =>
    api.put<AssessmentResult[]>(`/assessments/${id}/results`, { results }),

  statistics: (id: number): Promise<AssessmentStatistics> =>
    api.get<AssessmentStatistics>(`/assessments/${id}/statistics`),
};

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

export interface ExamPayload {
  classId: number;
  subjectId: number;
  termId?: number | null;
  roomId?: number | null;
  title: string;
  type: ExamType;
  examDate: string;
  startTime?: string | null;
  durationMinutes?: number | null;
  maxScore: number;
  instructions?: string | null;
}

export interface ExamListQuery extends ListQuery {
  academicYearId?: number;
  termId?: number;
  classId?: number;
  subjectId?: number;
  type?: ExamType;
  dateFrom?: string;
  dateTo?: string;
  upcomingOnly?: boolean;
}

export const examService = {
  list: (query: ExamListQuery = {}): Promise<PaginatedData<Exam>> =>
    api.getPaginated<Exam>('/exams', cleanParams(query)),

  upcoming: (
    query: { academicYearId?: number; classId?: number; limit?: number } = {},
  ): Promise<Exam[]> => api.get<Exam[]>('/exams/upcoming', cleanParams(query)),

  getById: (id: number): Promise<Exam> => api.get<Exam>(`/exams/${id}`),

  create: (payload: ExamPayload): Promise<Exam> => api.post<Exam>('/exams', payload),

  update: (
    id: number,
    payload: Partial<Omit<ExamPayload, 'classId' | 'subjectId'>>,
  ): Promise<Exam> => api.patch<Exam>(`/exams/${id}`, payload),

  archive: (id: number): Promise<null> => api.delete<null>(`/exams/${id}`),

  listResults: (id: number): Promise<ExamResult[]> => api.get<ExamResult[]>(`/exams/${id}/results`),

  saveResults: (
    id: number,
    results: { studentId: number; score?: number | null; isAbsent?: boolean; remark?: string | null }[],
  ): Promise<ExamResult[]> => api.put<ExamResult[]>(`/exams/${id}/results`, { results }),
};

// ---------------------------------------------------------------------------
// Grades
// ---------------------------------------------------------------------------

export interface GradeListQuery extends ListQuery {
  academicYearId?: number;
  termId?: number;
  classId?: number;
  subjectId?: number;
  studentId?: number;
  isFinal?: boolean;
}

export interface SaveGradePayload {
  studentId: number;
  classId: number;
  subjectId: number;
  termId?: number | null;
  score?: number | null;
  maxScore?: number;
  teacherComment?: string | null;
  isFinal?: boolean;
  reason?: string | null;
}

export const gradeService = {
  list: (query: GradeListQuery = {}): Promise<PaginatedData<Grade>> =>
    api.getPaginated<Grade>('/grades', cleanParams(query)),

  getById: (id: number): Promise<Grade> => api.get<Grade>(`/grades/${id}`),

  forStudent: (
    studentId: number,
    query: { academicYearId?: number; termId?: number } = {},
  ): Promise<Grade[]> => api.get<Grade[]>(`/grades/student/${studentId}`, cleanParams(query)),

  /** Preview the weighted calculation without persisting it. */
  calculate: (payload: {
    classId: number;
    subjectId: number;
    termId?: number | null;
  }): Promise<CalculatedGrade[]> => api.post<CalculatedGrade[]>('/grades/calculate', payload),

  generate: (payload: {
    classId: number;
    subjectId: number;
    termId?: number | null;
    isFinal?: boolean;
  }): Promise<Grade[]> => api.post<Grade[]>('/grades/generate', payload),

  save: (payload: SaveGradePayload): Promise<Grade> => api.post<Grade>('/grades', payload),

  saveMany: (grades: SaveGradePayload[]): Promise<Grade[]> =>
    api.put<Grade[]>('/grades/bulk', { grades }),

  history: (id: number): Promise<GradeHistoryEntry[]> =>
    api.get<GradeHistoryEntry[]>(`/grades/${id}/history`),

  schemes: (): Promise<GradingScheme[]> => api.get<GradingScheme[]>('/grades/schemes'),

  updateScheme: (
    id: number,
    payload: {
      components?: { assessmentType: AssessmentType; weightPercent: number }[];
      scales?: {
        letterGrade: string;
        minScore: number;
        maxScore: number;
        gpaPoint?: number | null;
        performance: PerformanceLevel;
        remarkEn?: string | null;
      }[];
    },
  ): Promise<GradingScheme> => api.patch<GradingScheme>(`/grades/schemes/${id}`, payload),

  performance: (query: {
    academicYearId: number;
    termId?: number;
    classId?: number;
  }): Promise<
    | { classId: number; className: string; average: number | null; studentCount: number }[]
    | { subjectId: number; subjectName: string; average: number | null; count: number }[]
  > => api.get('/grades/performance', cleanParams(query)),
};

// ---------------------------------------------------------------------------
// Report cards
// ---------------------------------------------------------------------------

export interface ReportCardListQuery extends ListQuery {
  academicYearId?: number;
  termId?: number;
  classId?: number;
  studentId?: number;
  status?: string;
}

export const reportCardService = {
  list: (query: ReportCardListQuery = {}): Promise<PaginatedData<ReportCardSummary>> =>
    api.getPaginated<ReportCardSummary>('/report-cards', cleanParams(query)),

  getById: (id: number): Promise<ReportCard> => api.get<ReportCard>(`/report-cards/${id}`),

  forStudent: (
    studentId: number,
    query: { academicYearId: number; termId?: number },
  ): Promise<ReportCard | null> =>
    api.get<ReportCard | null>(`/report-cards/student/${studentId}`, cleanParams(query)),

  generate: (payload: {
    classId: number;
    termId?: number | null;
    studentIds?: number[];
    publish?: boolean;
  }): Promise<ReportCard[]> => api.post<ReportCard[]>('/report-cards/generate', payload),

  update: (
    id: number,
    payload: {
      teacherComment?: string | null;
      homeroomComment?: string | null;
      principalComment?: string | null;
      subjectComments?: { subjectId: number; comment?: string | null }[];
    },
  ): Promise<ReportCard> => api.patch<ReportCard>(`/report-cards/${id}`, payload),

  setStatus: (id: number, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'): Promise<ReportCard> =>
    api.patch<ReportCard>(`/report-cards/${id}/status`, { status }),

  publishClass: (classId: number, termId?: number | null): Promise<{ published: number }> =>
    api.post<{ published: number }>('/report-cards/publish-class', { classId, termId }),
};
