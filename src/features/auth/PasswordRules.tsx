import { useTranslation } from 'react-i18next';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface PasswordRulesProps {
  password: string;
  className?: string;
}

/** Live checklist of the password policy, shown while a new password is typed. */
export const PasswordRules = ({ password, className }: PasswordRulesProps) => {
  const { t } = useTranslation('auth');

  const rules = [
    { key: 'length', met: password.length >= 8 },
    { key: 'lowercase', met: /[a-z]/.test(password) },
    { key: 'uppercase', met: /[A-Z]/.test(password) },
    { key: 'digit', met: /[0-9]/.test(password) },
  ];

  return (
    <div className={cn('rounded-lg bg-[var(--surface-muted)] p-3', className)}>
      <p className="text-xs font-medium text-[var(--text-muted)]">{t('passwordRules.title')}</p>

      <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {rules.map((rule) => (
          <li
            key={rule.key}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              rule.met ? 'text-[var(--success)]' : 'text-[var(--text-subtle)]',
            )}
          >
            {rule.met ? (
              <Check className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            {t(`passwordRules.${rule.key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
};
