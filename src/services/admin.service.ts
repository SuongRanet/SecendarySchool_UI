import { api, cleanParams } from './api';
import type { ListQuery, PaginatedData } from '@/types/api';
import type { RoleCode, UserStatus } from '@/types/domain';
import type { PermissionGroup, Role, User } from '@/types/domain';
import type {
  AdminDashboard,
  AuditLogEntry,
  ParentDashboard,
  PrincipalDashboard,
  StudentDashboard,
  TeacherDashboard,
} from '@/types/entities';

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface UserPayload {
  username: string;
  email: string;
  password: string;
  status?: UserStatus;
  roleCodes: RoleCode[];
}

export interface UserListQuery extends ListQuery {
  status?: UserStatus;
  roleCode?: RoleCode;
}

export const userService = {
  list: (query: UserListQuery = {}): Promise<PaginatedData<User>> =>
    api.getPaginated<User>('/users', cleanParams(query)),

  getById: (id: number): Promise<User> => api.get<User>(`/users/${id}`),

  create: (payload: UserPayload): Promise<User> => api.post<User>('/users', payload),

  update: (
    id: number,
    payload: { username?: string; email?: string; status?: UserStatus },
  ): Promise<User> => api.patch<User>(`/users/${id}`, payload),

  changeStatus: (id: number, status: UserStatus): Promise<User> =>
    api.patch<User>(`/users/${id}/status`, { status }),

  archive: (id: number): Promise<null> => api.delete<null>(`/users/${id}`),

  assignRoles: (id: number, roleCodes: RoleCode[]): Promise<User> =>
    api.put<User>(`/users/${id}/roles`, { roleCodes }),

  /** Returns a generated temporary password when none was supplied. */
  resetPassword: (id: number, password?: string): Promise<{ temporaryPassword: string | null }> =>
    api.post<{ temporaryPassword: string | null }>(`/users/${id}/reset-password`, { password }),
};

// ---------------------------------------------------------------------------
// Roles and permissions
// ---------------------------------------------------------------------------

export const roleService = {
  list: (): Promise<Role[]> => api.get<Role[]>('/roles'),

  permissions: (): Promise<PermissionGroup[]> => api.get<PermissionGroup[]>('/roles/permissions'),

  getById: (id: number): Promise<Role> => api.get<Role>(`/roles/${id}`),

  update: (id: number, payload: { name?: string; description?: string | null }): Promise<Role> =>
    api.patch<Role>(`/roles/${id}`, payload),

  updatePermissions: (id: number, permissionCodes: string[]): Promise<Role> =>
    api.put<Role>(`/roles/${id}/permissions`, { permissionCodes }),
};

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export interface AuditListQuery extends ListQuery {
  userId?: number;
  action?: string;
  entityType?: string;
  entityId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const auditService = {
  list: (query: AuditListQuery = {}): Promise<PaginatedData<AuditLogEntry>> =>
    api.getPaginated<AuditLogEntry>('/audit-logs', cleanParams(query)),

  forEntity: (entityType: string, entityId: number): Promise<AuditLogEntry[]> =>
    api.get<AuditLogEntry[]>(`/audit-logs/entity/${entityType}/${entityId}`),
};

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------

export const dashboardService = {
  admin: (): Promise<AdminDashboard> => api.get<AdminDashboard>('/dashboard/admin'),

  principal: (termId?: number): Promise<PrincipalDashboard> =>
    api.get<PrincipalDashboard>('/dashboard/principal', cleanParams({ termId })),

  teacher: (): Promise<TeacherDashboard> => api.get<TeacherDashboard>('/dashboard/teacher'),

  parent: (): Promise<ParentDashboard> => api.get<ParentDashboard>('/dashboard/parent'),

  student: (): Promise<StudentDashboard> => api.get<StudentDashboard>('/dashboard/student'),
};
