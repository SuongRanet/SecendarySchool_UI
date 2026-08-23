import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { parentService } from '@/services/people.service';
import type { ParentPayload } from '@/services/people.service';
import { ApiError } from '@/types/api';
import { GENDERS } from '@/types/domain';
import type { Parent } from '@/types/entities';
import { toast } from '@/stores/toast.store';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';

const buildSchema = (t: (key: string) => string) =>
  z.object({
    parentCode: z.string().trim().max(30).optional(),
    firstNameEn: z.string().trim().min(1, t('validation:required')).max(100),
    lastNameEn: z.string().trim().min(1, t('validation:required')).max(100),
    firstNameKh: z.string().trim().max(100).optional(),
    lastNameKh: z.string().trim().max(100).optional(),
    gender: z.string().optional(),
    phoneNumber: z.string().trim().max(30).optional(),
    alternatePhone: z.string().trim().max(30).optional(),
    email: z.union([z.string().trim().email(t('validation:invalidEmail')), z.literal('')]).optional(),
    occupation: z.string().trim().max(150).optional(),
    workplace: z.string().trim().max(150).optional(),
    address: z.string().trim().max(500).optional(),
    province: z.string().trim().max(100).optional(),
    isActive: z.boolean().optional(),
    createAccount: z.boolean().optional(),
    username: z.string().trim().max(100).optional(),
    accountEmail: z.string().trim().max(255).optional(),
    password: z.string().max(128).optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export interface ParentFormModalProps {
  open: boolean;
  parent: Parent | null;
  onClose: () => void;
  onSaved: () => void;
}

export const ParentFormModal = ({ open, parent, onClose, onSaved }: ParentFormModalProps) => {
  const { t } = useTranslation(['students', 'common', 'validation', 'users']);
  const isEditing = parent !== null;

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { isActive: true, createAccount: false },
  });

  const createAccount = form.watch('createAccount');

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(
      parent
        ? {
            parentCode: parent.parentCode,
            firstNameEn: parent.firstNameEn,
            lastNameEn: parent.lastNameEn,
            firstNameKh: parent.firstNameKh ?? '',
            lastNameKh: parent.lastNameKh ?? '',
            gender: parent.gender ?? '',
            phoneNumber: parent.phoneNumber ?? '',
            alternatePhone: parent.alternatePhone ?? '',
            email: parent.email ?? '',
            occupation: parent.occupation ?? '',
            workplace: parent.workplace ?? '',
            address: parent.address ?? '',
            province: parent.province ?? '',
            isActive: parent.isActive,
            createAccount: false,
          }
        : {
            parentCode: '',
            firstNameEn: '',
            lastNameEn: '',
            firstNameKh: '',
            lastNameKh: '',
            gender: '',
            phoneNumber: '',
            alternatePhone: '',
            email: '',
            occupation: '',
            workplace: '',
            address: '',
            province: '',
            isActive: true,
            createAccount: false,
            username: '',
            accountEmail: '',
            password: '',
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parent]);

  const onSubmit = form.handleSubmit(async (values) => {
    const base = {
      parentCode: values.parentCode || undefined,
      firstNameEn: values.firstNameEn,
      lastNameEn: values.lastNameEn,
      firstNameKh: values.firstNameKh || null,
      lastNameKh: values.lastNameKh || null,
      gender: (values.gender || null) as ParentPayload['gender'],
      phoneNumber: values.phoneNumber || null,
      alternatePhone: values.alternatePhone || null,
      email: values.email || null,
      occupation: values.occupation || null,
      workplace: values.workplace || null,
      address: values.address || null,
      province: values.province || null,
      isActive: values.isActive,
    };

    try {
      if (parent) {
        await parentService.update(parent.id, base);
        toast.success(t('common:toast.updated'));
      } else {
        const payload: ParentPayload = { ...base };

        if (values.createAccount && values.username && values.accountEmail && values.password) {
          payload.account = {
            username: values.username,
            email: values.accountEmail,
            password: values.password,
          };
        }

        await parentService.create(payload);
        toast.success(t('common:toast.created'));
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
      size="lg"
      title={isEditing ? t('common:actions.edit') : t('common:actions.create')}
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
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label={t('common:labels.firstName')}
            error={form.formState.errors.firstNameEn?.message}
            required
          >
            {({ id }) => <Input id={id} autoFocus {...form.register('firstNameEn')} />}
          </FormField>

          <FormField
            label={t('common:labels.lastName')}
            error={form.formState.errors.lastNameEn?.message}
            required
          >
            {({ id }) => <Input id={id} {...form.register('lastNameEn')} />}
          </FormField>

          <FormField label={t('common:labels.firstNameKh')}>
            {({ id }) => <Input id={id} className="font-khmer" {...form.register('firstNameKh')} />}
          </FormField>

          <FormField label={t('common:labels.lastNameKh')}>
            {({ id }) => <Input id={id} className="font-khmer" {...form.register('lastNameKh')} />}
          </FormField>

          <FormField label={t('common:labels.gender')}>
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

          <FormField label={t('common:labels.phone')}>
            {({ id }) => <Input id={id} type="tel" {...form.register('phoneNumber')} />}
          </FormField>

          <FormField label={t('common:labels.phone')} optionalLabel={t('common:labels.optional')}>
            {({ id }) => <Input id={id} type="tel" {...form.register('alternatePhone')} />}
          </FormField>

          <FormField label={t('common:labels.email')} error={form.formState.errors.email?.message}>
            {({ id }) => <Input id={id} type="email" {...form.register('email')} />}
          </FormField>

          <FormField label={t('students:guardians.relationship')}>
            {({ id }) => <Input id={id} {...form.register('occupation')} />}
          </FormField>

          <FormField label={t('common:labels.province')}>
            {({ id }) => <Input id={id} {...form.register('province')} />}
          </FormField>
        </div>

        <FormField label={t('common:labels.address')}>
          {({ id }) => <Input id={id} {...form.register('address')} />}
        </FormField>

        {!isEditing ? (
          <>
            <Checkbox
              id="createParentAccount"
              label={t('students:sections.accountOptional')}
              {...form.register('createAccount')}
            />

            {createAccount ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label={t('users:fields.username')} required>
                  {({ id }) => <Input id={id} {...form.register('username')} />}
                </FormField>

                <FormField label={t('users:fields.email')} required>
                  {({ id }) => <Input id={id} type="email" {...form.register('accountEmail')} />}
                </FormField>

                <FormField label={t('users:fields.password')} required>
                  {({ id }) => (
                    <PasswordInput id={id} autoComplete="new-password" {...form.register('password')} />
                  )}
                </FormField>
              </div>
            ) : null}
          </>
        ) : null}
      </form>
    </Modal>
  );
};
