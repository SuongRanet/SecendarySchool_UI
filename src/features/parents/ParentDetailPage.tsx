import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { parentService, studentService } from '@/services/people.service';
import { GUARDIAN_RELATIONSHIPS } from '@/types/domain';
import type { Parent, ParentChild, Student } from '@/types/entities';
import { useApiResource } from '@/hooks/useApiResource';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { RowActions } from '@/components/tables/RowActions';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { ParentFormModal } from './ParentFormModal';

export const ParentDetailPage = () => {
  const { t } = useTranslation(['students', 'common', 'users']);
  const params = useParams();
  const parentId = Number(params.id);
  const { has } = usePermission();
  const { run } = useMutation();

  const canUpdate = has(PERMISSIONS.PARENTS_UPDATE);
  const canLink = has(PERMISSIONS.PARENTS_LINK_STUDENTS);

  const [isEditOpen, setEditOpen] = useState(false);
  const [isLinkOpen, setLinkOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [linkStudentId, setLinkStudentId] = useState('');
  const [linkRelationship, setLinkRelationship] = useState('MOTHER');
  const [linkPrimary, setLinkPrimary] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState<ParentChild | null>(null);

  const parentFetcher = useCallback(() => parentService.getById(parentId), [parentId]);
  const parent = useApiResource<Parent>(parentFetcher, [parentId]);

  const childrenFetcher = useCallback(() => parentService.listChildren(parentId), [parentId]);
  const children = useApiResource<ParentChild[]>(childrenFetcher, [parentId]);

  const searchStudents = async (term: string) => {
    setStudentSearch(term);

    if (term.trim().length < 2) {
      setStudentResults([]);
      return;
    }

    try {
      const result = await studentService.list({ search: term, limit: 20 });
      setStudentResults(result.items);
    } catch {
      setStudentResults([]);
    }
  };

  if (parent.isLoading) {
    return <LoadingState />;
  }

  if (parent.error || !parent.data) {
    return (
      <ErrorState
        variant={parent.errorStatus === 403 ? 'forbidden' : 'error'}
        message={parent.error ?? undefined}
        onRetry={parent.refresh}
      />
    );
  }

  const record = parent.data;

  const childColumns: Column<ParentChild>[] = [
    {
      key: 'name',
      header: t('students:title'),
      render: (child) => (
        <Link
          to={ROUTES.studentDetail(child.studentId)}
          className="flex items-center gap-3 hover:text-[var(--primary)]"
        >
          <Avatar name={child.fullName} src={child.profilePhoto} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{child.fullName}</p>
            <p className="truncate text-xs text-[var(--text-subtle)]">{child.studentCode}</p>
          </div>
        </Link>
      ),
    },
    {
      key: 'class',
      header: t('students:fields.currentClass'),
      render: (child) =>
        child.currentClassName ? (
          <div>
            <p className="text-sm text-[var(--text)]">{child.currentClassName}</p>
            <p className="text-xs text-[var(--text-subtle)]">{child.currentGradeLevelName}</p>
          </div>
        ) : (
          <span className="text-[var(--text-subtle)]">{t('students:notEnrolled')}</span>
        ),
    },
    {
      key: 'relationship',
      header: t('students:guardians.relationship'),
      render: (child) => (
        <Badge tone="primary" size="sm">
          {t(`students:relationship.${child.relationship}`)}
        </Badge>
      ),
    },
    {
      key: 'flags',
      header: '',
      hideOnMobile: true,
      render: (child) => (
        <div className="flex flex-wrap gap-1">
          {child.isPrimaryContact ? (
            <Badge tone="success" size="sm">
              {t('students:guardians.primaryContact')}
            </Badge>
          ) : null}
          {child.canPickUp ? (
            <Badge tone="info" size="sm">
              {t('students:guardians.canPickUp')}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (child) => <StatusBadge kind="student" status={child.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (child) => (
        <RowActions
          label={child.fullName}
          items={
            canLink
              ? [
                  {
                    key: 'unlink',
                    label: t('students:guardians.remove'),
                    icon: <Trash2 className="size-4" />,
                    tone: 'danger',
                    onSelect: () => setConfirmUnlink(child),
                  },
                ]
              : []
          }
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={record.fullName}
        description={`${record.parentCode}${record.phoneNumber ? ` · ${record.phoneNumber}` : ''}`}
        breadcrumbs={[
          { label: t('students:fields.guardians'), to: ROUTES.parents },
          { label: record.fullName },
        ]}
        actions={
          canUpdate ? (
            <Button
              variant="secondary"
              onClick={() => setEditOpen(true)}
              leftIcon={<Pencil className="size-4" />}
            >
              {t('common:actions.edit')}
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardBody className="flex flex-col items-center gap-3 text-center">
            <Avatar name={record.fullName} src={record.profilePhoto} size="xl" />
            <div>
              <p className="text-lg font-semibold text-[var(--text)]">{record.fullName}</p>
              <p className="text-sm text-[var(--text-muted)]">{record.parentCode}</p>
            </div>
            <Badge tone={record.isActive ? 'success' : 'neutral'} dot>
              {record.isActive ? t('common:labels.yes') : t('common:labels.no')}
            </Badge>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t('students:sections.contact')} />
          <CardBody>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {[
                [t('common:labels.phone'), record.phoneNumber ?? '—'],
                [t('common:labels.email'), record.email ?? '—'],
                [t('common:labels.address'), record.address ?? '—'],
                [t('common:labels.province'), record.province ?? '—'],
                [t('students:guardians.relationship'), record.occupation ?? '—'],
                [t('users:fields.username'), record.username ?? '—'],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-[var(--text-muted)]">{label}</dt>
                  <dd className="mt-0.5 font-medium text-[var(--text)]">{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={t('students:title')}
          description={t('students:sections.guardianLinks')}
          action={
            canLink ? (
              <Button
                size="sm"
                onClick={() => {
                  setLinkStudentId('');
                  setStudentSearch('');
                  setStudentResults([]);
                  setLinkOpen(true);
                }}
                leftIcon={<Plus className="size-4" />}
              >
                {t('common:actions.add')}
              </Button>
            ) : null
          }
        />
        <CardBody className="p-0">
          <DataTable<ParentChild>
            columns={childColumns}
            rows={children.data ?? []}
            rowKey={(child) => child.linkId}
            isLoading={children.isLoading}
            error={children.error}
            onRetry={children.refresh}
            className="rounded-none border-0"
            emptyTitle={t('dashboard:parent.noChildren', { ns: 'dashboard' })}
            emptyAction={
              canLink ? (
                <Button onClick={() => setLinkOpen(true)} leftIcon={<GraduationCap className="size-4" />}>
                  {t('common:actions.add')}
                </Button>
              ) : null
            }
          />
        </CardBody>
      </Card>

      <ParentFormModal
        open={isEditOpen}
        parent={record}
        onClose={() => setEditOpen(false)}
        onSaved={parent.refresh}
      />

      <Modal
        open={isLinkOpen}
        onClose={() => setLinkOpen(false)}
        title={t('students:guardians.add')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLinkOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              disabled={!linkStudentId}
              onClick={async () => {
                const ok = await run(
                  () =>
                    parentService.linkChild(parentId, {
                      studentId: Number(linkStudentId),
                      relationship: linkRelationship as never,
                      isPrimaryContact: linkPrimary,
                    }),
                  t('students:toast.guardianLinked'),
                );

                if (ok) {
                  setLinkOpen(false);
                  children.refresh();
                  parent.refresh();
                }
              }}
            >
              {t('common:actions.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('students:placeholders.search')}>
            {({ id }) => (
              <Input
                id={id}
                autoFocus
                value={studentSearch}
                onChange={(event) => void searchStudents(event.target.value)}
                placeholder={t('students:placeholders.search')}
              />
            )}
          </FormField>

          <FormField label={t('students:title')} required>
            {({ id }) => (
              <Select
                id={id}
                value={linkStudentId}
                onChange={(event) => setLinkStudentId(event.target.value)}
                placeholder={t('common:actions.select')}
                options={studentResults.map((student) => ({
                  value: student.id,
                  label: `${student.fullName} · ${student.studentCode}`,
                }))}
              />
            )}
          </FormField>

          <FormField label={t('students:guardians.relationship')}>
            {({ id }) => (
              <Select
                id={id}
                value={linkRelationship}
                onChange={(event) => setLinkRelationship(event.target.value)}
                options={GUARDIAN_RELATIONSHIPS.map((relationship) => ({
                  value: relationship,
                  label: t(`students:relationship.${relationship}`),
                }))}
              />
            )}
          </FormField>

          <Checkbox
            id="parentLinkPrimary"
            label={t('students:guardians.primaryContact')}
            checked={linkPrimary}
            onChange={(event) => setLinkPrimary(event.target.checked)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmUnlink !== null}
        icon="delete"
        title={t('students:guardians.removeTitle')}
        message={t('students:guardians.removeMessage', { name: confirmUnlink?.fullName ?? '' })}
        onCancel={() => setConfirmUnlink(null)}
        onConfirm={async () => {
          if (confirmUnlink) {
            const ok = await run(
              () => parentService.unlinkChild(parentId, confirmUnlink.studentId),
              t('students:toast.guardianRemoved'),
            );

            if (ok) {
              children.refresh();
              parent.refresh();
            }
          }

          setConfirmUnlink(null);
        }}
      />
    </div>
  );
};
