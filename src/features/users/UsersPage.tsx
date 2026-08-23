import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Archive, KeyRound, Pencil, Plus, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { userService } from '@/services/admin.service';
import { ROLE_CODES, USER_STATUSES } from '@/types/domain';
import type { RoleCode, User, UserStatus } from '@/types/domain';
import { ApiError } from '@/types/api';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { toast } from '@/stores/toast.store';
import { formatDateTime } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { RowActions } from '@/components/tables/RowActions';

const buildCreateSchema = (t: (key: string) => string) =>
  z.object({
    username: z
      .string()
      .trim()
      .min(3, t('validation:minLength'))
      .max(100)
      .regex(/^[a-zA-Z0-9._-]+$/, t('validation:usernameFormat')),
    email: z.string().trim().min(1, t('validation:required')).email(t('validation:invalidEmail')),
    password: z
      .string()
      .min(8, t('validation:passwordLength'))
      .regex(/[a-z]/, t('validation:passwordLowercase'))
      .regex(/[A-Z]/, t('validation:passwordUppercase'))
      .regex(/[0-9]/, t('validation:passwordDigit')),
    status: z.enum(USER_STATUSES).optional(),
  });

type CreateValues = z.infer<ReturnType<typeof buildCreateSchema>>;

export const UsersPage = () => {
  const { t } = useTranslation(['users', 'common', 'validation']);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const { run } = useMutation();

  const canCreate = has(PERMISSIONS.USERS_CREATE);
  const canUpdate = has(PERMISSIONS.USERS_UPDATE);
  const canDisable = has(PERMISSIONS.USERS_DISABLE);
  const canAssignRoles = has(PERMISSIONS.USERS_ASSIGN_ROLES);
  const canResetPassword = has(PERMISSIONS.USERS_RESET_PASSWORD);

  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<RoleCode[]>(['TEACHER']);
  const [rolesTarget, setRolesTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ user: User; status: UserStatus } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<User | null>(null);

  const fetcher = useCallback(
    (query: {
      page: number;
      limit: number;
      search: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters: Record<string, string>;
    }) =>
      userService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        status: (query.filters.status as UserStatus) || undefined,
        roleCode: (query.filters.roleCode as RoleCode) || undefined,
      }),
    [],
  );

  const list = useListQuery<User>({
    fetcher,
    filterKeys: ['status', 'roleCode'],
    defaultSortBy: 'created_at',
  });

  const form = useForm<CreateValues>({
    resolver: zodResolver(buildCreateSchema(t)),
    defaultValues: { username: '', email: '', password: '', status: 'ACTIVE' },
  });

  const openCreate = () => {
    setEditing(null);
    setSelectedRoles(['TEACHER']);
    form.reset({ username: '', email: '', password: '', status: 'ACTIVE' });
    setFormOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setSelectedRoles(user.roles);
    form.reset({
      username: user.username,
      email: user.email,
      password: 'PlaceholderPass1',
      status: user.status,
    });
    setFormOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (selectedRoles.length === 0) {
      toast.error(t('validation:selectAtLeastOne'));
      return;
    }

    try {
      if (editing) {
        await userService.update(editing.id, {
          username: values.username,
          email: values.email,
          status: values.status,
        });
        await userService.assignRoles(editing.id, selectedRoles);
        toast.success(t('users:toast.updated'));
      } else {
        await userService.create({
          username: values.username,
          email: values.email,
          password: values.password,
          status: values.status,
          roleCodes: selectedRoles,
        });
        toast.success(t('users:toast.created'));
      }

      setFormOpen(false);
      list.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.isValidationError) {
        for (const fieldError of caught.fieldErrors) {
          form.setError(fieldError.field as keyof CreateValues, { message: fieldError.message });
        }
        return;
      }

      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    }
  });

  const toggleRole = (role: RoleCode) => {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );
  };

  const columns: Column<User>[] = [
    {
      key: 'username',
      header: t('users:fields.username'),
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName ?? user.username} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--text)]">
              {user.fullName ?? user.username}
            </p>
            <p className="truncate text-xs text-[var(--text-subtle)]">@{user.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('users:fields.email'),
      sortable: true,
      hideOnMobile: true,
      render: (user) => <span className="text-[var(--text-muted)]">{user.email}</span>,
    },
    {
      key: 'roles',
      header: t('users:fields.roles'),
      hideOnMobile: true,
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <Badge key={role} tone="primary" size="sm">
              {t(`users:roles.${role}`)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'last_login_at',
      header: t('users:fields.lastLogin'),
      sortable: true,
      hideOnMobile: true,
      render: (user) =>
        user.lastLoginAt ? (
          <span className="text-xs text-[var(--text-muted)]">
            {formatDateTime(user.lastLoginAt, language)}
          </span>
        ) : (
          <span className="text-[var(--text-subtle)]">—</span>
        ),
    },
    {
      key: 'status',
      header: t('users:fields.status'),
      sortable: true,
      render: (user) => <StatusBadge kind="user" status={user.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (user) => (
        <RowActions
          label={user.username}
          items={[
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => openEdit(user),
                  },
                ]
              : []),
            ...(canAssignRoles
              ? [
                  {
                    key: 'roles',
                    label: t('users:actions.assignRoles'),
                    icon: <ShieldCheck className="size-4" />,
                    onSelect: () => {
                      setRolesTarget(user);
                      setSelectedRoles(user.roles);
                    },
                  },
                ]
              : []),
            ...(canResetPassword
              ? [
                  {
                    key: 'reset',
                    label: t('users:actions.resetPassword'),
                    icon: <KeyRound className="size-4" />,
                    onSelect: () => setResetTarget(user),
                  },
                ]
              : []),
            ...(canDisable
              ? [
                  user.status === 'ACTIVE'
                    ? {
                        key: 'disable',
                        label: t('users:actions.disable'),
                        icon: <UserX className="size-4" />,
                        separatorBefore: true,
                        onSelect: () => setStatusTarget({ user, status: 'INACTIVE' }),
                      }
                    : {
                        key: 'enable',
                        label: t('users:actions.enable'),
                        icon: <UserCheck className="size-4" />,
                        separatorBefore: true,
                        onSelect: () => setStatusTarget({ user, status: 'ACTIVE' }),
                      },
                  {
                    key: 'archive',
                    label: t('users:actions.archive'),
                    icon: <Archive className="size-4" />,
                    tone: 'danger' as const,
                    onSelect: () => setArchiveTarget(user),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('users:title')}
        description={t('users:subtitle')}
        actions={
          canCreate ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('users:create')}
            </Button>
          ) : null
        }
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('users:placeholders.search')}
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
        filters={
          <>
            <Select
              className="w-44"
              value={list.query.filters.status ?? ''}
              onChange={(event) => list.setFilter('status', event.target.value)}
              placeholder={t('users:filters.status')}
              options={USER_STATUSES.map((status) => ({
                value: status,
                label: t(`users:status.${status}`),
              }))}
            />

            <Select
              className="w-48"
              value={list.query.filters.roleCode ?? ''}
              onChange={(event) => list.setFilter('roleCode', event.target.value)}
              placeholder={t('users:filters.role')}
              options={ROLE_CODES.map((role) => ({
                value: role,
                label: t(`users:roles.${role}`),
              }))}
            />
          </>
        }
      />

      <DataTable<User>
        columns={columns}
        rows={list.rows}
        rowKey={(user) => user.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        sort={{ sortBy: list.query.sortBy, sortOrder: list.query.sortOrder }}
        onSortChange={list.setSort}
        emptyTitle={t('users:empty.title')}
        emptyMessage={t('users:empty.message')}
        emptyAction={
          canCreate ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('users:create')}
            </Button>
          ) : null
        }
        footer={
          <Pagination
            pagination={list.pagination}
            onPageChange={list.setPage}
            onLimitChange={list.setLimit}
          />
        }
      />

      {/* Create / edit */}
      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('users:edit') : t('users:create')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={onSubmit} isLoading={form.formState.isSubmitting}>
              {t('common:actions.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField
            label={t('users:fields.username')}
            error={form.formState.errors.username?.message}
            required
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                autoFocus
                placeholder={t('users:placeholders.username')}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...form.register('username')}
              />
            )}
          </FormField>

          <FormField
            label={t('users:fields.email')}
            error={form.formState.errors.email?.message}
            required
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="email"
                placeholder={t('users:placeholders.email')}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...form.register('email')}
              />
            )}
          </FormField>

          {!editing ? (
            <FormField
              label={t('users:fields.password')}
              error={form.formState.errors.password?.message}
              required
            >
              {({ id, describedBy, invalid }) => (
                <PasswordInput
                  id={id}
                  autoComplete="new-password"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register('password')}
                />
              )}
            </FormField>
          ) : null}

          <FormField label={t('users:fields.status')}>
            {({ id }) => (
              <Select
                id={id}
                options={USER_STATUSES.map((status) => ({
                  value: status,
                  label: t(`users:status.${status}`),
                }))}
                {...form.register('status')}
              />
            )}
          </FormField>

          <fieldset className="rounded-lg border border-[var(--border)] p-3">
            <legend className="px-1 text-sm font-medium text-[var(--text)]">
              {t('users:fields.roles')}
            </legend>

            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROLE_CODES.map((role) => (
                <Checkbox
                  key={role}
                  id={`role-${role}`}
                  label={t(`users:roles.${role}`)}
                  checked={selectedRoles.includes(role)}
                  onChange={() => toggleRole(role)}
                />
              ))}
            </div>
          </fieldset>
        </form>
      </Modal>

      {/* Role assignment */}
      <Modal
        open={rolesTarget !== null}
        onClose={() => setRolesTarget(null)}
        title={t('users:actions.assignRoles')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRolesTarget(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (!rolesTarget) {
                  return;
                }

                const ok = await run(
                  () => userService.assignRoles(rolesTarget.id, selectedRoles),
                  t('users:toast.rolesAssigned'),
                );

                if (ok) {
                  setRolesTarget(null);
                  list.refresh();
                }
              }}
            >
              {t('common:actions.save')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ROLE_CODES.map((role) => (
            <Checkbox
              key={role}
              id={`assign-role-${role}`}
              label={t(`users:roles.${role}`)}
              checked={selectedRoles.includes(role)}
              onChange={() => toggleRole(role)}
            />
          ))}
        </div>
      </Modal>

      {/* Password reset */}
      <Modal
        open={resetTarget !== null}
        onClose={() => {
          setResetTarget(null);
          setTemporaryPassword(null);
        }}
        title={t('users:dialogs.resetPasswordTitle')}
        closeLabel={t('common:actions.close')}
        footer={
          temporaryPassword ? (
            <Button
              onClick={() => {
                setResetTarget(null);
                setTemporaryPassword(null);
              }}
            >
              {t('common:actions.close')}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setResetTarget(null)}>
                {t('common:actions.cancel')}
              </Button>
              <Button
                onClick={async () => {
                  if (!resetTarget) {
                    return;
                  }

                  try {
                    const result = await userService.resetPassword(resetTarget.id);
                    setTemporaryPassword(result.temporaryPassword);
                    toast.success(t('users:toast.passwordReset'));
                  } catch (caught) {
                    toast.error(
                      caught instanceof ApiError ? caught.message : t('common:toast.failed'),
                    );
                  }
                }}
              >
                {t('users:actions.resetPassword')}
              </Button>
            </>
          )
        }
      >
        {temporaryPassword ? (
          <div>
            <p className="text-sm text-[var(--text-muted)]">
              {t('users:dialogs.temporaryPasswordHint')}
            </p>
            <code className="mt-3 block rounded-lg bg-[var(--surface-muted)] p-3 text-center text-lg font-semibold tracking-wide text-[var(--text)]">
              {temporaryPassword}
            </code>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            {t('users:dialogs.resetPasswordMessage', {
              name: resetTarget?.fullName ?? resetTarget?.username ?? '',
            })}
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={statusTarget !== null}
        tone={statusTarget?.status === 'ACTIVE' ? 'info' : 'warning'}
        icon={statusTarget?.status === 'ACTIVE' ? 'info' : 'warning'}
        title={t(
          statusTarget?.status === 'ACTIVE'
            ? 'users:dialogs.enableTitle'
            : 'users:dialogs.disableTitle',
        )}
        message={t(
          statusTarget?.status === 'ACTIVE'
            ? 'users:dialogs.enableMessage'
            : 'users:dialogs.disableMessage',
          { name: statusTarget?.user.fullName ?? statusTarget?.user.username ?? '' },
        )}
        onCancel={() => setStatusTarget(null)}
        onConfirm={async () => {
          if (statusTarget) {
            const ok = await run(
              () => userService.changeStatus(statusTarget.user.id, statusTarget.status),
              t('users:toast.statusChanged'),
            );

            if (ok) {
              list.refresh();
            }
          }

          setStatusTarget(null);
        }}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        icon="archive"
        title={t('users:dialogs.archiveTitle')}
        message={t('users:dialogs.archiveMessage', {
          name: archiveTarget?.fullName ?? archiveTarget?.username ?? '',
        })}
        confirmLabel={t('common:actions.archive')}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (archiveTarget) {
            const ok = await run(
              () => userService.archive(archiveTarget.id),
              t('users:toast.archived'),
            );

            if (ok) {
              list.refresh();
            }
          }

          setArchiveTarget(null);
        }}
      />
    </div>
  );
};
