import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { teacherService } from '@/services/people.service';
import type { TeacherPayload } from '@/services/people.service';
import { ApiError } from '@/types/api';
import { GENDERS, STAFF_STATUSES } from '@/types/domain';
import type { Teacher } from '@/types/entities';
import { useAcademicOptions } from '@/hooks/useAcademicOptions';
import { toast } from '@/stores/toast.store';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/Select';

const buildSchema = (t: (key: string) => string) =>
  z.object({
    teacherCode: z.string().trim().max(30).optional(),
    firstNameEn: z.string().trim().min(1, t('validation:required')).max(100),
    lastNameEn: z.string().trim().min(1, t('validation:required')).max(100),
    firstNameKh: z.string().trim().max(100).optional(),
    lastNameKh: z.string().trim().max(100).optional(),
    gender: z.string().optional(),
    dateOfBirth: z.string().optional(),
    nationalId: z.string().trim().max(50).optional(),
    phoneNumber: z.string().trim().max(30).optional(),
    email: z.union([z.string().trim().email(t('validation:invalidEmail')), z.literal('')]).optional(),
    address: z.string().trim().max(500).optional(),
    qualification: z.string().trim().max(150).optional(),
    specialization: z.string().trim().max(150).optional(),
    hireDate: z.string().optional(),
    status: z.enum(STAFF_STATUSES).optional(),
    notes: z.string().trim().max(1000).optional(),
    createAccount: z.boolean().optional(),
    username: z.string().trim().max(100).optional(),
    accountEmail: z.string().trim().max(255).optional(),
    password: z.string().max(128).optional(),
    isHomeroomTeacher: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export interface TeacherFormModalProps {
  open: boolean;
  teacher: Teacher | null;
  onClose: () => void;
  onSaved: () => void;
}

export const TeacherFormModal = ({ open, teacher, onClose, onSaved }: TeacherFormModalProps) => {
  const { t } = useTranslation(['teachers', 'common', 'validation', 'academics']);
  const options = useAcademicOptions({ years: false, gradeLevels: false, subjects: true });
  const isEditing = teacher !== null;

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { status: 'ACTIVE', createAccount: false },
  });

  const createAccount = form.watch('createAccount');

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(
      teacher
        ? {
            teacherCode: teacher.teacherCode,
            firstNameEn: teacher.firstNameEn,
            lastNameEn: teacher.lastNameEn,
            firstNameKh: teacher.firstNameKh ?? '',
            lastNameKh: teacher.lastNameKh ?? '',
            gender: teacher.gender ?? '',
            dateOfBirth: teacher.dateOfBirth ?? '',
            nationalId: teacher.nationalId ?? '',
            phoneNumber: teacher.phoneNumber ?? '',
            email: teacher.email ?? '',
            address: teacher.address ?? '',
            qualification: teacher.qualification ?? '',
            specialization: teacher.specialization ?? '',
            hireDate: teacher.hireDate ?? '',
            status: teacher.status,
            notes: teacher.notes ?? '',
            createAccount: false,
          }
        : {
            teacherCode: '',
            firstNameEn: '',
            lastNameEn: '',
            firstNameKh: '',
            lastNameKh: '',
            gender: '',
            dateOfBirth: '',
            nationalId: '',
            phoneNumber: '',
            email: '',
            address: '',
            qualification: '',
            specialization: '',
            hireDate: new Date().toISOString().slice(0, 10),
            status: 'ACTIVE',
            notes: '',
            createAccount: false,
            username: '',
            accountEmail: '',
            password: '',
            isHomeroomTeacher: false,
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacher]);

  const onSubmit = form.handleSubmit(async (values) => {
    const base = {
      teacherCode: values.teacherCode || undefined,
      firstNameEn: values.firstNameEn,
      lastNameEn: values.lastNameEn,
      firstNameKh: values.firstNameKh || null,
      lastNameKh: values.lastNameKh || null,
      gender: (values.gender || null) as TeacherPayload['gender'],
      dateOfBirth: values.dateOfBirth || null,
      nationalId: values.nationalId || null,
      phoneNumber: values.phoneNumber || null,
      email: values.email || null,
      address: values.address || null,
      qualification: values.qualification || null,
      specialization: values.specialization || null,
      hireDate: values.hireDate || null,
      status: values.status,
      notes: values.notes || null,
    };

    try {
      if (teacher) {
        await teacherService.update(teacher.id, base);
        toast.success(t('teachers:toast.updated'));
      } else {
        const payload: TeacherPayload = { ...base };

        if (values.createAccount && values.username && values.accountEmail && values.password) {
          payload.account = {
            username: values.username,
            email: values.accountEmail,
            password: values.password,
            isHomeroomTeacher: values.isHomeroomTeacher,
          };
        }

        await teacherService.create(payload);
        toast.success(t('teachers:toast.created'));
      }

      onSaved();
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.isValidationError) {
        for (const fieldError of caught.fieldErrors) {
          form.setError(fieldError.field.split('.').pop() as keyof FormValues, {
            message: fieldError.message,
          });
        }
        return;
      }

      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEditing ? t('teachers:edit') : t('teachers:create')}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={onSubmit} isLoading={form.formState.isSubmitting}>
            {t('common:actions.save')}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('teachers:sections.personal')}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('teachers:fields.firstNameEn')}
              error={form.formState.errors.firstNameEn?.message}
              required
            >
              {({ id }) => <Input id={id} autoFocus {...form.register('firstNameEn')} />}
            </FormField>

            <FormField
              label={t('teachers:fields.lastNameEn')}
              error={form.formState.errors.lastNameEn?.message}
              required
            >
              {({ id }) => <Input id={id} {...form.register('lastNameEn')} />}
            </FormField>

            <FormField label={t('teachers:fields.firstNameKh')}>
              {({ id }) => <Input id={id} className="font-khmer" {...form.register('firstNameKh')} />}
            </FormField>

            <FormField label={t('teachers:fields.lastNameKh')}>
              {({ id }) => <Input id={id} className="font-khmer" {...form.register('lastNameKh')} />}
            </FormField>

            <FormField label={t('teachers:fields.gender')}>
              {({ id }) => (
                <Select
                  id={id}
                  placeholder={t('common:actions.select')}
                  options={GENDERS.map((gender) => ({
                    value: gender,
                    label: t(`common:gender.${gender}`),
                  }))}
                  {...form.register('gender')}
                />
              )}
            </FormField>

            <FormField label={t('teachers:fields.dateOfBirth')}>
              {({ id }) => <Input id={id} type="date" {...form.register('dateOfBirth')} />}
            </FormField>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('teachers:sections.contact')}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('teachers:fields.phoneNumber')}>
              {({ id }) => <Input id={id} type="tel" {...form.register('phoneNumber')} />}
            </FormField>

            <FormField
              label={t('teachers:fields.email')}
              error={form.formState.errors.email?.message}
            >
              {({ id }) => <Input id={id} type="email" {...form.register('email')} />}
            </FormField>

            <FormField label={t('teachers:fields.nationalId')}>
              {({ id }) => <Input id={id} {...form.register('nationalId')} />}
            </FormField>

            <FormField label={t('teachers:fields.address')}>
              {({ id }) => <Input id={id} {...form.register('address')} />}
            </FormField>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('teachers:sections.employment')}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('teachers:fields.teacherCode')}
              hint={isEditing ? undefined : t('teachers:placeholders.codeAuto')}
            >
              {({ id }) => <Input id={id} {...form.register('teacherCode')} />}
            </FormField>

            <FormField label={t('teachers:fields.hireDate')}>
              {({ id }) => <Input id={id} type="date" {...form.register('hireDate')} />}
            </FormField>

            <FormField label={t('teachers:fields.qualification')}>
              {({ id }) => (
                <Input
                  id={id}
                  placeholder={t('teachers:placeholders.qualification')}
                  {...form.register('qualification')}
                />
              )}
            </FormField>

            <FormField label={t('teachers:fields.specialization')}>
              {({ id }) => (
                <Select
                  id={id}
                  placeholder={t('common:actions.select')}
                  options={options.subjects.map((subject) => ({
                    value: subject.nameEn,
                    label: subject.nameEn,
                  }))}
                  {...form.register('specialization')}
                />
              )}
            </FormField>

            <FormField label={t('teachers:fields.status')}>
              {({ id }) => (
                <Select
                  id={id}
                  options={STAFF_STATUSES.map((status) => ({
                    value: status,
                    label: t(`teachers:status.${status}`),
                  }))}
                  {...form.register('status')}
                />
              )}
            </FormField>
          </div>

          <FormField label={t('teachers:fields.notes')} optionalLabel={t('common:labels.optional')}>
            {({ id }) => <Textarea id={id} rows={2} {...form.register('notes')} />}
          </FormField>
        </section>

        {!isEditing ? (
          <section className="flex flex-col gap-4">
            <Checkbox
              id="createTeacherAccount"
              label={t('teachers:sections.accountOptional')}
              {...form.register('createAccount')}
            />

            {createAccount ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField label={t('common:labels.name')} required>
                    {({ id }) => <Input id={id} {...form.register('username')} />}
                  </FormField>

                  <FormField label={t('common:labels.email')} required>
                    {({ id }) => <Input id={id} type="email" {...form.register('accountEmail')} />}
                  </FormField>

                  <FormField label={t('teachers:fields.account')} required>
                    {({ id }) => (
                      <PasswordInput
                        id={id}
                        autoComplete="new-password"
                        {...form.register('password')}
                      />
                    )}
                  </FormField>
                </div>

                <Checkbox
                  id="isHomeroomTeacher"
                  label={t('teachers:account.isHomeroom')}
                  {...form.register('isHomeroomTeacher')}
                />
              </>
            ) : null}
          </section>
        ) : null}
      </form>
    </Modal>
  );
};
