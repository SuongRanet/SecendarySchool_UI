import { z } from 'zod';
import type { TFunction } from 'i18next';

/**
 * Frontend validation schemas.
 *
 * These exist for immediate feedback while typing. The backend validates the same
 * rules again with its own Zod schemas, which is what actually protects the data.
 */

export const buildLoginSchema = (t: TFunction) =>
  z.object({
    identifier: z.string().trim().min(1, t('validation:required')),
    password: z.string().min(1, t('validation:required')),
  });

const passwordField = (t: TFunction) =>
  z
    .string()
    .min(8, t('validation:passwordLength'))
    .max(128, t('validation:maxLength', { count: 128 }))
    .regex(/[a-z]/, t('validation:passwordLowercase'))
    .regex(/[A-Z]/, t('validation:passwordUppercase'))
    .regex(/[0-9]/, t('validation:passwordDigit'));

export const buildForgotPasswordSchema = (t: TFunction) =>
  z.object({
    email: z.string().trim().min(1, t('validation:required')).email(t('validation:invalidEmail')),
  });

export const buildResetPasswordSchema = (t: TFunction) =>
  z
    .object({
      password: passwordField(t),
      confirmPassword: z.string().min(1, t('validation:required')),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ['confirmPassword'],
      message: t('validation:passwordMismatch'),
    });

export const buildChangePasswordSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z.string().min(1, t('validation:required')),
      newPassword: passwordField(t),
      confirmPassword: z.string().min(1, t('validation:required')),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      path: ['confirmPassword'],
      message: t('validation:passwordMismatch'),
    });

export type LoginFormValues = z.infer<ReturnType<typeof buildLoginSchema>>;
export type ForgotPasswordFormValues = z.infer<ReturnType<typeof buildForgotPasswordSchema>>;
export type ResetPasswordFormValues = z.infer<ReturnType<typeof buildResetPasswordSchema>>;
export type ChangePasswordFormValues = z.infer<ReturnType<typeof buildChangePasswordSchema>>;
