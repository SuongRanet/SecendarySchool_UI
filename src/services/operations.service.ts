import { api, cleanParams } from './api';
import type { ListQuery, PaginatedData } from '@/types/api';
import type { AttendanceStatus, Weekday } from '@/types/domain';
import type {
  AttendanceRecord,
  AttendanceReason,
  AttendanceSheet,
  ClassAttendanceSummary,
  DailyAttendancePoint,
  PendingAttendanceClass,
  Schedule,
  ScheduleConflict,
  StudentAttendanceSummary,
  TodayAttendanceOverview,
} from '@/types/entities';

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

export interface SchedulePayload {
  classId: number;
  subjectId: number;
  teacherId?: number | null;
  roomId?: number | null;
  dayOfWeek: Weekday;
  periodNumber?: number | null;
  startTime: string;
  endTime: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
  isActive?: boolean;
  ignoreWarnings?: boolean;
}

export interface ScheduleQuery {
  academicYearId?: number;
  classId?: number;
  teacherId?: number;
  roomId?: number;
  subjectId?: number;
  studentId?: number;
  dayOfWeek?: Weekday;
  isActive?: boolean;
}

export const scheduleService = {
  list: (query: ScheduleQuery = {}): Promise<Schedule[]> =>
    api.get<Schedule[]>('/schedules', cleanParams(query)),

  today: (query: { teacherId?: number; classId?: number } = {}): Promise<Schedule[]> =>
    api.get<Schedule[]>('/schedules/today', cleanParams(query)),

  getById: (id: number): Promise<Schedule> => api.get<Schedule>(`/schedules/${id}`),

  create: (payload: SchedulePayload): Promise<{ schedule: Schedule; conflicts: ScheduleConflict[] }> =>
    api.post('/schedules', payload),

  update: (
    id: number,
    payload: Partial<SchedulePayload>,
  ): Promise<{ schedule: Schedule; conflicts: ScheduleConflict[] }> =>
    api.patch(`/schedules/${id}`, payload),

  remove: (id: number): Promise<null> => api.delete<null>(`/schedules/${id}`),

  /** Checks a proposed slot before saving so the editor can warn in place. */
  checkConflicts: (payload: {
    classId: number;
    dayOfWeek: Weekday;
    startTime: string;
    endTime: string;
    teacherId?: number | null;
    roomId?: number | null;
    excludeScheduleId?: number;
  }): Promise<{ conflicts: ScheduleConflict[]; hasBlockingConflict: boolean }> =>
    api.post('/schedules/check-conflicts', payload),
};

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export interface AttendanceEntry {
  studentId: number;
  status: AttendanceStatus;
  reasonId?: number | null;
  note?: string | null;
  minutesLate?: number | null;
}

export interface AttendanceListQuery extends ListQuery {
  classId?: number;
  studentId?: number;
  academicYearId?: number;
  subjectId?: number;
  status?: AttendanceStatus;
  dateFrom?: string;
  dateTo?: string;
  periodNumber?: number;
}

export const attendanceService = {
  list: (query: AttendanceListQuery = {}): Promise<PaginatedData<AttendanceRecord>> =>
    api.getPaginated<AttendanceRecord>('/attendance', cleanParams(query)),

  reasons: (): Promise<AttendanceReason[]> => api.get<AttendanceReason[]>('/attendance/reasons'),

  sheet: (classId: number, date: string, periodNumber?: number): Promise<AttendanceSheet> =>
    api.get<AttendanceSheet>('/attendance/sheet', cleanParams({ classId, date, periodNumber })),

  record: (payload: {
    classId: number;
    attendanceDate: string;
    periodNumber?: number | null;
    subjectId?: number | null;
    scheduleId?: number | null;
    entries: AttendanceEntry[];
  }): Promise<AttendanceRecord[]> => api.post<AttendanceRecord[]>('/attendance', payload),

  update: (
    id: number,
    payload: {
      status?: AttendanceStatus;
      reasonId?: number | null;
      note?: string | null;
      minutesLate?: number | null;
    },
  ): Promise<AttendanceRecord> => api.patch<AttendanceRecord>(`/attendance/${id}`, payload),

  remove: (id: number): Promise<null> => api.delete<null>(`/attendance/${id}`),

  studentSummary: (
    studentId: number,
    query: { academicYearId?: number; dateFrom?: string; dateTo?: string } = {},
  ): Promise<StudentAttendanceSummary> =>
    api.get<StudentAttendanceSummary>(
      `/attendance/summary/student/${studentId}`,
      cleanParams(query),
    ),

  classSummary: (
    classId: number,
    query: { dateFrom?: string; dateTo?: string } = {},
  ): Promise<{ summary: ClassAttendanceSummary; students: StudentAttendanceSummary[] }> =>
    api.get(`/attendance/summary/class/${classId}`, cleanParams(query)),

  trend: (query: {
    academicYearId: number;
    classId?: number;
    dateFrom: string;
    dateTo: string;
  }): Promise<DailyAttendancePoint[]> =>
    api.get<DailyAttendancePoint[]>('/attendance/trend', cleanParams(query)),

  today: (academicYearId?: number): Promise<TodayAttendanceOverview> =>
    api.get<TodayAttendanceOverview>('/attendance/today', cleanParams({ academicYearId })),

  missing: (
    query: { academicYearId?: number; date?: string; teacherId?: number } = {},
  ): Promise<PendingAttendanceClass[]> =>
    api.get<PendingAttendanceClass[]>('/attendance/missing', cleanParams(query)),
};
