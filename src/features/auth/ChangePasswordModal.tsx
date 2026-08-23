import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/types/api';
import { toast } from '@/stores/toast.store';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { buildChangePasswordSchema } from './auth.schemas';
import type { ChangePasswordFormValues } from './auth.schemas';
import { PasswordRules } from './PasswordRules';

export interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export const ChangePasswordModal = ({ open, onClose }: ChangePasswordModalProps) => {
  const { t } = useTranslation(['auth', 'validation', 'common']);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(buildChangePasswordSchema(t)),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const newPassword = watch('newPassword');

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authService.changePassword(values);
      toast.success(t('auth:changePassword.success'));
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'INVALID_CURRENT_PASSWORD') {
        setError('currentPassword', { message: caught.message });
        return;
      }

      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('auth:changePassword.title')}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={onSubmit} isLoading={isSubmitting}>
            {t('auth:changePassword.submit')}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          label={t('auth:changePassword.currentPassword')}
          error={errors.currentPassword?.message}
          required
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="current-password"
              showLabel={t('auth:login.showPassword')}
              hideLabel={t('auth:login.hidePassword')}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('currentPassword')}
            />
          )}
        </FormField>

        <FormField
          label={t('auth:changePassword.newPassword')}
          error={errors.newPassword?.message}
          required
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              showLabel={t('auth:login.showPassword')}
              hideLabel={t('auth:login.hidePassword')}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('newPassword')}
            />
          )}
        </FormField>

        <PasswordRules password={newPassword ?? ''} />

        <FormField
          label={t('auth:changePassword.confirmPassword')}
          error={errors.confirmPassword?.message}
          required
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              showLabel={t('auth:login.showPassword')}
              hideLabel={t('auth:login.hidePassword')}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('confirmPassword')}
            />
          )}
        </FormField>
      </form>
    </Modal>
  );
};
