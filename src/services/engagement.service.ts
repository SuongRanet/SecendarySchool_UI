import { api, cleanParams } from './api';
import type { ListQuery, PaginatedData } from '@/types/api';
import type {
  AnnouncementAudience,
  AnnouncementStatus,
  AssignmentStatus,
  BehaviorType,
  NotificationType,
} from '@/types/domain';
import type {
  Announcement,
  AppNotification,
  Assignment,
  Behavior,
  BehaviorSummary,
  StudentComment,
  Submission,
} from '@/types/entities';

// ---------------------------------------------------------------------------
// Assignments (homework)
// ---------------------------------------------------------------------------

export interface AssignmentPayload {
  classId: number;
  subjectId: number;
  termId?: number | null;
  title: string;
  description?: string | null;
  instructions?: string | null;
  attachmentUrl?: string | null;
  assignedDate?: string;
  dueDate: string;
  maxScore?: number | null;
  publishNow?: boolean;
}

export interface AssignmentListQuery extends ListQuery {
  academicYearId?: number;
  classId?: number;
  subjectId?: number;
  teacherId?: number;
  studentId?: number;
  status?: AssignmentStatus;
  dueFrom?: string;
  dueTo?: string;
  pendingOnly?: boolean;
}

export const assignmentService = {
  list: (query: AssignmentListQuery = {}): Promise<PaginatedData<Assignment>> =>
    api.getPaginated<Assignment>('/assignments', cleanParams(query)),

  getById: (id: number): Promise<Assignment> => api.get<Assignment>(`/assignments/${id}`),

  create: (payload: AssignmentPayload): Promise<Assignment> =>
    api.post<Assignment>('/assignments', payload),

  update: (
    id: number,
    payload: Partial<Omit<AssignmentPayload, 'classId' | 'subjectId' | 'publishNow'>>,
  ): Promise<Assignment> => api.patch<Assignment>(`/assignments/${id}`, payload),

  publish: (id: number): Promise<Assignment> => api.post<Assignment>(`/assignments/${id}/publish`),

  close: (id: number): Promise<Assignment> => api.post<Assignment>(`/assignments/${id}/close`),

  archive: (id: number): Promise<null> => api.delete<null>(`/assignments/${id}`),

  listSubmissions: (id: number): Promise<Submission[]> =>
    api.get<Submission[]>(`/assignments/${id}/submissions`),

  gradeSubmissions: (
    id: number,
    results: { studentId: number; score?: number | null; feedback?: string | null }[],
  ): Promise<Submission[]> => api.put<Submission[]>(`/assignments/${id}/submissions`, { results }),

  submit: (
    id: number,
    payload: { studentId?: number; content?: string | null; attachmentUrl?: string | null },
  ): Promise<Submission[]> => api.post<Submission[]>(`/assignments/${id}/submit`, payload),
};

// ---------------------------------------------------------------------------
// Behavior and development
// ---------------------------------------------------------------------------

export interface BehaviorPayload {
  studentId: number;
  classId?: number | null;
  type: BehaviorType;
  title: string;
  description?: string | null;
  occurredOn?: string;
  points?: number;
  actionTaken?: string | null;
  visibleToParent?: boolean;
}

export interface BehaviorListQuery extends ListQuery {
  studentId?: number;
  classId?: number;
  academicYearId?: number;
  type?: BehaviorType;
  dateFrom?: string;
  dateTo?: string;
  visibleToParentOnly?: boolean;
}

export const behaviorService = {
  list: (query: BehaviorListQuery = {}): Promise<PaginatedData<Behavior>> =>
    api.getPaginated<Behavior>('/behaviors', cleanParams(query)),

  getById: (id: number): Promise<Behavior> => api.get<Behavior>(`/behaviors/${id}`),

  create: (payload: BehaviorPayload): Promise<Behavior> => api.post<Behavior>('/behaviors', payload),

  update: (id: number, payload: Partial<Omit<BehaviorPayload, 'studentId'>>): Promise<Behavior> =>
    api.patch<Behavior>(`/behaviors/${id}`, payload),

  archive: (id: number): Promise<null> => api.delete<null>(`/behaviors/${id}`),

  summary: (studentId: number, academicYearId?: number): Promise<BehaviorSummary> =>
    api.get<BehaviorSummary>(`/behaviors/summary/${studentId}`, cleanParams({ academicYearId })),

  listComments: (
    studentId: number,
    query: { academicYearId?: number; termId?: number; visibleToParentOnly?: boolean } = {},
  ): Promise<StudentComment[]> =>
    api.get<StudentComment[]>(`/behaviors/comments/${studentId}`, cleanParams(query)),

  createComment: (payload: {
    studentId: number;
    termId?: number | null;
    classId?: number | null;
    subjectId?: number | null;
    isHomeroom?: boolean;
    comment: string;
    visibleToParent?: boolean;
  }): Promise<StudentComment> => api.post<StudentComment>('/behaviors/comments', payload),

  removeComment: (id: number): Promise<null> => api.delete<null>(`/behaviors/comments/${id}`),
};

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export interface AnnouncementPayload {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  gradeLevelId?: number | null;
  classId?: number | null;
  isPinned?: boolean;
  publishAt?: string | null;
  expiresAt?: string | null;
  attachmentUrl?: string | null;
  publishNow?: boolean;
}

export interface AnnouncementListQuery extends ListQuery {
  status?: AnnouncementStatus;
  audience?: AnnouncementAudience;
  classId?: number;
  gradeLevelId?: number;
}

export const announcementService = {
  list: (query: AnnouncementListQuery = {}): Promise<PaginatedData<Announcement>> =>
    api.getPaginated<Announcement>('/announcements', cleanParams(query)),

  feed: (query: ListQuery = {}): Promise<PaginatedData<Announcement>> =>
    api.getPaginated<Announcement>('/announcements/feed', cleanParams(query)),

  getById: (id: number): Promise<Announcement> => api.get<Announcement>(`/announcements/${id}`),

  create: (payload: AnnouncementPayload): Promise<Announcement> =>
    api.post<Announcement>('/announcements', payload),

  update: (
    id: number,
    payload: Partial<Omit<AnnouncementPayload, 'publishNow'>>,
  ): Promise<Announcement> => api.patch<Announcement>(`/announcements/${id}`, payload),

  publish: (id: number): Promise<Announcement> =>
    api.post<Announcement>(`/announcements/${id}/publish`),

  archive: (id: number): Promise<Announcement> =>
    api.post<Announcement>(`/announcements/${id}/archive`),

  remove: (id: number): Promise<null> => api.delete<null>(`/announcements/${id}`),
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationService = {
  list: (
    query: ListQuery & { isRead?: boolean; type?: NotificationType } = {},
  ): Promise<PaginatedData<AppNotification>> =>
    api.getPaginated<AppNotification>('/notifications', cleanParams(query)),

  unreadCount: (): Promise<{ count: number }> =>
    api.get<{ count: number }>('/notifications/unread-count'),

  markRead: (id: number): Promise<null> => api.post<null>(`/notifications/${id}/read`),

  markAllRead: (): Promise<{ updated: number }> =>
    api.post<{ updated: number }>('/notifications/read-all'),

  archive: (id: number): Promise<null> => api.post<null>(`/notifications/${id}/archive`),

  send: (payload: {
    type: NotificationType;
    title: string;
    body?: string | null;
    actionUrl?: string | null;
    userIds?: number[];
    audience?: {
      scope: 'ALL' | 'TEACHERS' | 'PARENTS' | 'STUDENTS' | 'GRADE' | 'CLASS';
      gradeLevelId?: number | null;
      classId?: number | null;
    };
  }): Promise<{ delivered: number }> => api.post<{ delivered: number }>('/notifications/send', payload),
};
