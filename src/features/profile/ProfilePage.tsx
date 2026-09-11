import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { PERMISSIONS } from '@/constants/permissions';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguageStore } from '@/stores/language.store';
import { formatDateTime } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/feedback/States';
import { ChangePasswordModal } from '@/features/auth/ChangePasswordModal';

export const ProfilePage = () => {
  const { t } = useTranslation(['system', 'common', 'users', 'students', 'teachers']);
  const language = useLanguageStore((state) => state.language);
  const user = useAuthStore((state) => state.user);
  const { has } = usePermission();
  const [isPasswordOpen, setPasswordOpen] = useState(false);

  if (!user) {
    return <LoadingState />;
  }

  /**
   * The link to the full record lives in the administrator workspace, so it is
   * only offered to someone who may open it. A student following it landed on
   * an administrator screen they have no permission to read.
   */
  const canOpenAdminRecord =
    (user.profileType === 'STUDENT' && has(PERMISSIONS.STUDENTS_VIEW)) ||
    (user.profileType === 'TEACHER' && has(PERMISSIONS.TEACHERS_VIEW)) ||
    (user.profileType === 'PARENT' && has(PERMISSIONS.PARENTS_VIEW));

  const profileLink = !canOpenAdminRecord
    ? null
    : user.profileType === 'STUDENT' && user.studentId
      ? ROUTES.studentDetail(user.studentId)
      : user.profileType === 'TEACHER' && user.teacherId
        ? ROUTES.teacherDetail(user.teacherId)
        : user.profileType === 'PARENT' && user.parentId
          ? ROUTES.parentDetail(user.parentId)
          : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('system:profile.title')} description={t('system:profile.subtitle')} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardBody className="flex flex-col items-center gap-3 text-center">
            <Avatar name={user.fullName ?? user.username} size="xl" />

            <div>
              <p className="text-lg font-semibold text-[var(--text)]">
                {user.fullName ?? user.username}
              </p>
              <p className="text-sm text-[var(--text-muted)]">@{user.username}</p>
            </div>

            <StatusBadge kind="user" status={user.status} />

            <div className="flex flex-wrap justify-center gap-1.5">
              {user.roles.map((role) => (
                <Badge key={role} tone="primary" size="sm">
                  {t(`users:roles.${role}`)}
                </Badge>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={t('system:profile.sections.account')}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPasswordOpen(true)}
                leftIcon={<KeyRound className="size-4" />}
              >
                {t('system:profile.changePassword')}
              </Button>
            }
          />

          <CardBody className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {user.profileCode ? (
                <div>
                  <dt className="text-[var(--text-muted)]">{t('system:profile.fields.code')}</dt>
                  <dd className="mt-0.5 font-mono font-medium tracking-wide text-[var(--text)]">
                    {user.profileCode}
                  </dd>
                </div>
              ) : null}

              <div>
                <dt className="text-[var(--text-muted)]">{t('system:profile.fields.username')}</dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">{user.username}</dd>
              </div>

              <div>
                <dt className="text-[var(--text-muted)]">{t('system:profile.fields.email')}</dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">{user.email}</dd>
              </div>

              <div>
                <dt className="text-[var(--text-muted)]">{t('system:profile.fields.lastLogin')}</dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt, language) : '—'}
                </dd>
              </div>

              <div>
                <dt className="text-[var(--text-muted)]">
                  {t('system:profile.fields.profileType')}
                </dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">
                  {user.profileType ? (
                    profileLink ? (
                      <Link to={profileLink} className="text-[var(--primary)] hover:underline">
                        {t(`users:profileType.${user.profileType}`)}
                      </Link>
                    ) : (
                      t(`users:profileType.${user.profileType}`)
                    )
                  ) : (
                    t('system:profile.noProfile')
                  )}
                </dd>
              </div>
            </dl>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                <ShieldCheck className="size-4 text-[var(--text-subtle)]" aria-hidden="true" />
                {t('system:profile.fields.permissions')}
                <span className="text-xs font-normal text-[var(--text-subtle)]">
                  ({t('system:profile.permissionCount', { count: user.permissions.length })})
                </span>
              </p>

              <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-lg bg-[var(--surface-muted)] p-3">
                {user.permissions.length === 0 ? (
                  <span className="text-sm text-[var(--text-subtle)]">—</span>
                ) : (
                  [...user.permissions].sort().map((permission) => (
                    <code
                      key={permission}
                      className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs text-[var(--text-muted)]"
                    >
                      {permission}
                    </code>
                  ))
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <ChangePasswordModal open={isPasswordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
};
