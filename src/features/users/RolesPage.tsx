import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Save, ShieldCheck } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { roleService } from '@/services/admin.service';
import type { PermissionGroup, Role } from '@/types/domain';
import { useApiResource } from '@/hooks/useApiResource';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorState, LoadingState } from '@/components/feedback/States';

export const RolesPage = () => {
  const { t } = useTranslation(['users', 'common']);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.ROLES_MANAGE);
  const { run, isRunning } = useMutation();

  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const fetcher = useCallback(() => roleService.list(), []);
  const { data: roles, isLoading, error, refresh } = useApiResource(fetcher);

  useEffect(() => {
    roleService
      .permissions()
      .then(setPermissionGroups)
      .catch(() => setPermissionGroups([]));
  }, []);

  // Select the first role once the list arrives.
  useEffect(() => {
    if (roles && roles.length > 0 && selectedRoleId === null) {
      setSelectedRoleId(roles[0].id);
      setSelectedPermissions(roles[0].permissions);
    }
  }, [roles, selectedRoleId]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !roles) {
    return <ErrorState message={error ?? undefined} onRetry={refresh} />;
  }

  const selectedRole: Role | undefined = roles.find((role) => role.id === selectedRoleId);
  const isSuperAdmin = selectedRole?.code === 'SUPER_ADMIN';

  const selectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setSelectedPermissions(role.permissions);
  };

  const togglePermission = (code: string) => {
    setSelectedPermissions((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  };

  const toggleModule = (group: PermissionGroup) => {
    const codes = group.permissions.map((permission) => permission.code);
    const allSelected = codes.every((code) => selectedPermissions.includes(code));

    setSelectedPermissions((current) =>
      allSelected
        ? current.filter((code) => !codes.includes(code))
        : [...new Set([...current, ...codes])],
    );
  };

  const save = async () => {
    if (!selectedRole) {
      return;
    }

    const ok = await run(
      () => roleService.updatePermissions(selectedRole.id, selectedPermissions),
      t('users:rolesPage.permissionsSaved'),
    );

    if (ok) {
      refresh();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('users:rolesPage.title')}
        description={t('users:rolesPage.subtitle')}
        actions={
          canManage && selectedRole && !isSuperAdmin ? (
            <Button onClick={save} isLoading={isRunning} leftIcon={<Save className="size-4" />}>
              {t('users:rolesPage.savePermissions')}
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
        {/* Role list */}
        <Card className="h-fit">
          <CardHeader title={t('users:fields.roles')} />
          <CardBody className="p-2">
            <ul className="flex flex-col gap-1">
              {roles.map((role) => {
                const isSelected = role.id === selectedRoleId;

                return (
                  <li key={role.id}>
                    <button
                      type="button"
                      onClick={() => selectRole(role)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors',
                        isSelected
                          ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                          : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
                      )}
                    >
                      <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {t(`users:roles.${role.code}`)}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--text-subtle)]">
                          {t('users:rolesPage.userCount', { count: role.userCount })} ·{' '}
                          {formatNumber(role.permissions.length, language)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        {/* Permission matrix */}
        <Card>
          <CardHeader
            title={selectedRole ? t(`users:roles.${selectedRole.code}`) : t('users:rolesPage.title')}
            description={selectedRole?.description ?? undefined}
            action={
              selectedRole?.isSystem ? (
                <Badge tone="neutral" size="sm">
                  {t('users:rolesPage.systemRole')}
                </Badge>
              ) : null
            }
          />

          <CardBody className="flex flex-col gap-4">
            {isSuperAdmin ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-[var(--info)]/30 bg-[var(--info-soft)] p-3 text-sm text-[var(--info)]">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{t('users:rolesPage.superAdminNotice')}</span>
              </div>
            ) : null}

            {permissionGroups.map((group) => {
              const codes = group.permissions.map((permission) => permission.code);
              const allSelected = codes.every((code) => selectedPermissions.includes(code));

              return (
                <fieldset
                  key={group.module}
                  className="rounded-lg border border-[var(--border)] p-3"
                  disabled={isSuperAdmin || !canManage}
                >
                  <legend className="flex items-center gap-2 px-1">
                    <Checkbox
                      id={`module-${group.module}`}
                      checked={allSelected}
                      onChange={() => toggleModule(group)}
                      label={
                        <span className="text-sm font-medium capitalize">
                          {group.module.replace(/_/g, ' ')}
                        </span>
                      }
                    />
                  </legend>

                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.permissions.map((permission) => (
                      <Checkbox
                        key={permission.code}
                        id={`permission-${permission.code}`}
                        label={permission.name}
                        checked={isSuperAdmin || selectedPermissions.includes(permission.code)}
                        onChange={() => togglePermission(permission.code)}
                      />
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
