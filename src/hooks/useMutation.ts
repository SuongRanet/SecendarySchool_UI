import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/types/api';
import { toast } from '@/stores/toast.store';

export interface UseMutationResult {
  isRunning: boolean;
  /**
   * Runs a write request, shows a success toast, and turns an API failure into an
   * error toast. Returns `true` when it succeeded so the caller can close a
   * dialog or refresh a list.
   */
  run: (action: () => Promise<unknown>, successMessage?: string) => Promise<boolean>;
}

export const useMutation = (): UseMutationResult => {
  const { t } = useTranslation('common');
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(
    async (action: () => Promise<unknown>, successMessage?: string): Promise<boolean> => {
      setIsRunning(true);

      try {
        await action();

        if (successMessage) {
          toast.success(successMessage);
        }

        return true;
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : t('toast.failed'));
        return false;
      } finally {
        setIsRunning(false);
      }
    },
    [t],
  );

  return { isRunning, run };
};
