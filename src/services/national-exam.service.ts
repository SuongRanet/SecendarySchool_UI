import type {
  NationalExamGrade,
  NationalExamRegistration,
  NationalExamRegStatus,
  NationalExamResult,
  NationalExamSession,
  NationalExamStatistics,
} from '@/types/entities';
import { api, cleanParams } from './api';

export interface SessionPayload {
  academicYearId: number;
  name: string;
  centreName?: string | null;
  centreCode?: string | null;
  startsOn: string;
  endsOn: string;
  registrationDeadline?: string | null;
  notes?: string | null;
}

export interface RegistrationQuery {
  sessionId?: number;
  studentId?: number;
  classId?: number;
  status?: NationalExamRegStatus;
  search?: string;
}

export interface ResultPayload {
  resultGrade: NationalExamGrade;
  totalScore?: number | null;
  isPass?: boolean;
  publishedOn?: string;
  subjectScores?: { subjectId: number; score: number; maxScore?: number }[];
}

/**
 * The Grade 9 national examination (Diplôme).
 *
 * Note there is no "update result" call: a published result is immutable, and a
 * correction goes through `amendResult`, which keeps the superseded value.
 */
export const nationalExamService = {
  // Sessions
  listSessions: (academicYearId?: number): Promise<NationalExamSession[]> =>
    api.get<NationalExamSession[]>('/national-exams/sessions', cleanParams({ academicYearId })),

  getSession: (id: number): Promise<NationalExamSession> =>
    api.get<NationalExamSession>(`/national-exams/sessions/${id}`),

  createSession: (payload: SessionPayload): Promise<NationalExamSession> =>
    api.post<NationalExamSession>('/national-exams/sessions', payload),

  updateSession: (
    id: number,
    payload: Partial<Omit<SessionPayload, 'academicYearId'>> & { isOpen?: boolean },
  ): Promise<NationalExamSession> =>
    api.patch<NationalExamSession>(`/national-exams/sessions/${id}`, payload),

  deleteSession: (id: number): Promise<null> =>
    api.delete<null>(`/national-exams/sessions/${id}`),

  statistics: (id: number): Promise<NationalExamStatistics> =>
    api.get<NationalExamStatistics>(`/national-exams/sessions/${id}/statistics`),

  candidateList: (
    id: number,
  ): Promise<{ session: NationalExamSession; candidates: NationalExamRegistration[] }> =>
    api.get(`/national-exams/sessions/${id}/candidates`),

  // Registrations
  listRegistrations: (query: RegistrationQuery = {}): Promise<NationalExamRegistration[]> =>
    api.get<NationalExamRegistration[]>('/national-exams/registrations', cleanParams(query)),

  register: (
    sessionId: number,
    payload: { studentId: number; seatNumber?: string | null; remarks?: string | null },
  ): Promise<NationalExamRegistration> =>
    api.post<NationalExamRegistration>(
      `/national-exams/sessions/${sessionId}/registrations`,
      payload,
    ),

  registerResit: (
    sessionId: number,
    payload: { studentId: number; seatNumber?: string | null; remarks?: string | null },
  ): Promise<NationalExamRegistration> =>
    api.post<NationalExamRegistration>(`/national-exams/sessions/${sessionId}/resits`, payload),

  updateRegistration: (
    id: number,
    payload: { seatNumber?: string | null; status?: NationalExamRegStatus; remarks?: string | null },
  ): Promise<NationalExamRegistration> =>
    api.patch<NationalExamRegistration>(`/national-exams/registrations/${id}`, payload),

  cancelRegistration: (id: number): Promise<null> =>
    api.delete<null>(`/national-exams/registrations/${id}`),

  // Results
  getResult: (registrationId: number): Promise<NationalExamResult | null> =>
    api.get<NationalExamResult | null>(`/national-exams/registrations/${registrationId}/result`),

  resultHistory: (registrationId: number): Promise<NationalExamResult[]> =>
    api.get<NationalExamResult[]>(
      `/national-exams/registrations/${registrationId}/result/history`,
    ),

  publishResult: (registrationId: number, payload: ResultPayload): Promise<NationalExamResult> =>
    api.post<NationalExamResult>(
      `/national-exams/registrations/${registrationId}/result`,
      payload,
    ),

  amendResult: (
    registrationId: number,
    payload: ResultPayload & { reason: string },
  ): Promise<NationalExamResult> =>
    api.post<NationalExamResult>(
      `/national-exams/registrations/${registrationId}/result/amend`,
      payload,
    ),

  /** The signed-in student's own sitting, resolved from the token. */
  mine: (): Promise<NationalExamRegistration[]> =>
    api.get<NationalExamRegistration[]>('/national-exams/me'),
};
