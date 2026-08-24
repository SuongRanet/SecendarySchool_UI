import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { studentService } from '@/services/people.service';
import type { StudentPayload } from '@/services/people.service';
import { ApiError } from '@/types/api';
import { GENDERS, STUDENT_STATUSES } from '@/types/domain';
import type { Student } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { toast } from '@/stores/toast.store';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/Select';

const buildSchema = (t: (key: string) => string) =>
  z.object({
    studentCode: z.string().trim().max(30).optional(),
    firstNameEn: z.string().trim().min(1, t('validation:required')).max(100),
    lastNameEn: z.string().trim().min(1, t('validation:required')).max(100),
    firstNameKh: z.string().trim().max(100).optional(),
    lastNameKh: z.string().trim().max(100).optional(),
    gender: z.string().optional(),
    dateOfBirth: z.string().optional(),
    placeOfBirth: z.string().trim().max(150).optional(),
    nationalId: z.string().trim().max(50).optional(),
    phoneNumber: z.string().trim().max(30).optional(),
    email: z.union([z.string().trim().email(t('validation:invalidEmail')), z.literal('')]).optional(),
    currentAddress: z.string().trim().max(500).optional(),
    province: z.string().trim().max(100).optional(),
    enrolledDate: z.string().optional(),
    status: z.enum(STUDENT_STATUSES).optional(),
    notes: z.string().trim().max(1000).optional(),
    // First enrollment (create only)
    academicYearId: z.string().optional(),
    classId: z.string().optional(),
    rollNumber: z.string().trim().max(20).optional(),
    // Optional account (create only)
    createAccount: z.boolean().optional(),
    username: z.string().trim().max(100).optional(),
    accountEmail: z.string().trim().max(255).optional(),
    password: z.string().max(128).optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export interface StudentFormModalProps {
  open: boolean;
  student: Student | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Create or edit a student. On creation the form can also enroll the student and
 * create their login account — the backend writes all of it in one transaction.
 */
export const StudentFormModal = ({ open, student, onClose, onSaved }: StudentFormModalProps) => {
  const { t } = useTranslation(['students', 'common', 'validation', 'academics']);
  const options = useAcademicOptions({ years: true, gradeLevels: false });
  const [academicYearId, setAcademicYearId] = useState<number | undefined>(undefined);
  const { classes } = useClassOptions(academicYearId);

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { status: 'ACTIVE', createAccount: false },
  });

  const createAccount = form.watch('createAccount');
  const isEditing = student !== null;
  // An existing login is changed from the user administration screen, not here.
  const canAddAccount = !student?.username;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (student) {
      form.reset({
        studentCode: student.studentCode,
        firstNameEn: student.firstNameEn,
        lastNameEn: student.lastNameEn,
        firstNameKh: student.firstNameKh ?? '',
        lastNameKh: student.lastNameKh ?? '',
        gender: student.gender ?? '',
        dateOfBirth: student.dateOfBirth ?? '',
        placeOfBirth: student.placeOfBirth ?? '',
        nationalId: student.nationalId ?? '',
        phoneNumber: student.phoneNumber ?? '',
        email: student.email ?? '',
        currentAddress: student.currentAddress ?? '',
        province: student.province ?? '',
        enrolledDate: student.enrolledDate ?? '',
        status: student.status,
        notes: student.notes ?? '',
        createAccount: false,
      });
      return;
    }

    const defaultYear = options.activeYear?.id;
    setAcademicYearId(defaultYear);

    form.reset({
      studentCode: '',
      firstNameEn: '',
      lastNameEn: '',
      firstNameKh: '',
      lastNameKh: '',
      gender: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationalId: '',
      phoneNumber: '',
      email: '',
      currentAddress: '',
      province: '',
      enrolledDate: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
      notes: '',
      academicYearId: defaultYear ? String(defaultYear) : '',
      classId: '',
      rollNumber: '',
      createAccount: false,
      username: '',
      accountEmail: '',
      password: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student, options.activeYear]);

  const onSubmit = form.handleSubmit(async (values) => {
    const base = {
      studentCode: values.studentCode || undefined,
      firstNameEn: values.firstNameEn,
      lastNameEn: values.lastNameEn,
      firstNameKh: values.firstNameKh || null,
      lastNameKh: values.lastNameKh || null,
      gender: (values.gender || null) as StudentPayload['gender'],
      dateOfBirth: values.dateOfBirth || null,
      placeOfBirth: values.placeOfBirth || null,
      nationalId: values.nationalId || null,
      phoneNumber: values.phoneNumber || null,
      email: values.email || null,
      currentAddress: values.currentAddress || null,
      province: values.province || null,
      enrolledDate: values.enrolledDate || null,
      status: values.status,
      notes: values.notes || null,
    };

    try {
      if (student) {
        await studentService.update(student.id, base);

        // A login asked for while editing is created against the saved record,
        // which is what makes "add the account later" work.
        if (canAddAccount && values.createAccount && values.username && values.accountEmail && values.password) {
          await studentService.createAccount(student.id, {
            username: values.username,
            email: values.accountEmail,
            password: values.password,
          });
        }

        toast.success(t('students:toast.updated'));
      } else {
        const payload: StudentPayload = { ...base };

        if (values.academicYearId && values.classId) {
          payload.enrollment = {
            academicYearId: Number(values.academicYearId),
            classId: Number(values.classId),
            rollNumber: values.rollNumber || null,
            enrolledDate: values.enrolledDate || undefined,
          };
        }

        if (values.createAccount && values.username && values.accountEmail && values.password) {
          payload.account = {
            username: values.username,
            email: values.accountEmail,
            password: values.password,
          };
        }

        await studentService.create(payload);
        toast.success(t('students:toast.created'));
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
      title={isEditing ? t('students:edit') : t('students:create')}
      description={t('common:forms.requiredLegend')}
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
            {t('students:sections.personal')}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('students:fields.firstNameEn')}
              error={form.formState.errors.firstNameEn?.message}
              required
            >
              {({ id }) => <Input id={id} autoFocus {...form.register('firstNameEn')} />}
            </FormField>

            <FormField
              label={t('students:fields.lastNameEn')}
              error={form.formState.errors.lastNameEn?.message}
              required
            >
              {({ id }) => <Input id={id} {...form.register('lastNameEn')} />}
            </FormField>

            <FormField
              label={t('students:fields.firstNameKh')}
            >
              {({ id }) => <Input id={id} className="font-khmer" {...form.register('firstNameKh')} />}
            </FormField>

            <FormField
              label={t('students:fields.lastNameKh')}
            >
              {({ id }) => <Input id={id} className="font-khmer" {...form.register('lastNameKh')} />}
            </FormField>

            <FormField label={t('students:fields.gender')}>
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

            <FormField label={t('students:fields.dateOfBirth')} hint={t('common:forms.dobHint')}>
              {({ id }) => <Input id={id} type="date" {...form.register('dateOfBirth')} />}
            </FormField>

            <FormField label={t('students:fields.placeOfBirth')}>
              {({ id }) => <Input id={id} {...form.register('placeOfBirth')} />}
            </FormField>

            <FormField label={t('students:fields.nationalId')}>
              {({ id }) => <Input id={id} {...form.register('nationalId')} />}
            </FormField>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('students:sections.contact')}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('students:fields.phoneNumber')}>
              {({ id }) => <Input id={id} type="tel" {...form.register('phoneNumber')} />}
            </FormField>

            <FormField
              label={t('students:fields.email')}
              error={form.formState.errors.email?.message}
            >
              {({ id }) => <Input id={id} type="email" {...form.register('email')} />}
            </FormField>

            <FormField label={t('students:fields.province')}>
              {({ id }) => <Input id={id} {...form.register('province')} />}
            </FormField>

            <FormField label={t('students:fields.currentAddress')}>
              {({ id }) => <Input id={id} {...form.register('currentAddress')} />}
            </FormField>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('students:sections.school')}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              label={t('students:fields.studentCode')}
              hint={isEditing ? undefined : t('students:placeholders.codeAuto')}
            >
              {({ id }) => <Input id={id} {...form.register('studentCode')} />}
            </FormField>

            <FormField label={t('students:fields.enrolledDate')}>
              {({ id }) => <Input id={id} type="date" {...form.register('enrolledDate')} />}
            </FormField>

            <FormField label={t('students:fields.status')}>
              {({ id }) => (
                <Select
                  id={id}
                  options={STUDENT_STATUSES.map((status) => ({
                    value: status,
                    label: t(`students:status.${status}`),
                  }))}
                  {...form.register('status')}
                />
              )}
            </FormField>
          </div>

          <FormField label={t('students:fields.notes')}>
            {({ id }) => <Textarea id={id} rows={2} {...form.register('notes')} />}
          </FormField>
        </section>

        {!isEditing ? (
          <>
            <section className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {t('students:sections.firstEnrollment')}
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label={t('students:fields.academicYear')}>
                  {({ id }) => (
                    <Select
                      id={id}
                      placeholder={t('common:actions.select')}
                      options={options.academicYears
                        .filter((year) => year.status !== 'CLOSED')
                        .map((year) => ({ value: year.id, label: year.name }))}
                      {...form.register('academicYearId', {
                        onChange: (event) => {
                          const value = event.target.value;
                          setAcademicYearId(value ? Number(value) : undefined);
                          form.setValue('classId', '');
                        },
                      })}
                    />
                  )}
                </FormField>

                <FormField
                  label={t('students:fields.currentClass')}
                  hint={t('common:forms.noClassWarning')}
                >
                  {({ id }) => (
                    <Select
                      id={id}
                      placeholder={t('common:actions.select')}
                      options={classes.map((schoolClass) => ({
                        value: schoolClass.id,
                        label: `${schoolClass.name} (${schoolClass.enrolledCount}/${schoolClass.capacity})`,
                        disabled: schoolClass.availableSeats === 0,
                      }))}
                      {...form.register('classId')}
                    />
                  )}
                </FormField>

                <FormField label={t('students:fields.rollNumber')}>
                  {({ id }) => <Input id={id} {...form.register('rollNumber')} />}
                </FormField>
              </div>
            </section>

          </>
        ) : null}

        {/* A login can be added later: this stays available while editing, until
            the student actually has an account. */}
        {canAddAccount ? (
          <section className="flex flex-col gap-4">
            <Checkbox
              id="createStudentAccount"
              label={t('students:sections.accountOptional')}
              {...form.register('createAccount')}
            />

            {createAccount ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label={t('common:labels.name')} required>
                  {({ id }) => <Input id={id} {...form.register('username')} />}
                </FormField>

                <FormField label={t('common:labels.email')} required>
                  {({ id }) => <Input id={id} type="email" {...form.register('accountEmail')} />}
                </FormField>

                <FormField label={t('students:fields.account')} required>
                  {({ id }) => (
                    <PasswordInput id={id} autoComplete="new-password" {...form.register('password')} />
                  )}
                </FormField>
              </div>
            ) : null}
          </section>
        ) : null}
      </form>
    </Modal>
  );
};
