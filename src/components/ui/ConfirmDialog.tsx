import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Archive, Info, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';
import { Modal } from './Modal';

export type ConfirmTone = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  message: ReactNode;
  tone?: ConfirmTone;
  icon?: 'delete' | 'archive' | 'warning' | 'info';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const TONE_STYLES: Record<ConfirmTone, { icon: string; button: 'danger' | 'primary' }> = {
  danger: { icon: 'bg-[var(--danger-soft)] text-[var(--danger)]', button: 'danger' },
  warning: { icon: 'bg-[var(--warning-soft)] text-[var(--warning)]', button: 'primary' },
  info: { icon: 'bg-[var(--info-soft)] text-[var(--info)]', button: 'primary' },
};

const ICONS = {
  delete: Trash2,
  archive: Archive,
  warning: AlertTriangle,
  info: Info,
} as const;

/**
 * Confirmation gate for destructive actions. The confirm button stays in a
 * loading state until the handler settles, so a slow request cannot be fired twice.
 */
export const ConfirmDialog = ({
  open,
  title,
  message,
  tone = 'danger',
  icon = 'warning',
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { t } = useTranslation('common');
  const [isWorking, setIsWorking] = useState(false);
  const IconComponent = ICONS[icon];
  const styles = TONE_STYLES[tone];

  const handleConfirm = async () => {
    setIsWorking(true);

    try {
      await onConfirm();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={isWorking ? () => undefined : onCancel}
      size="sm"
      closeOnBackdrop={!isWorking}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isWorking}>
            {cancelLabel ?? t('actions.cancel')}
          </Button>
          <Button variant={styles.button} onClick={handleConfirm} isLoading={isWorking}>
            {confirmLabel ?? t('actions.confirm')}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <span
          aria-hidden="true"
          className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', styles.icon)}
        >
          <IconComponent className="size-5" />
        </span>

        <div className="min-w-0 pt-0.5">
          <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">{message}</p>
        </div>
      </div>
    </Modal>
  );
};
