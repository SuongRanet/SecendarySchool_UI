import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/types/api';

export interface UseApiResourceResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  errorStatus: number | null;
  refresh: () => void;
  setData: (data: T | null) => void;
}

/**
 * Loads a single resource and exposes the loading, success and error states every
 * detail page needs. The request is cancelled if the component unmounts first.
 */
export const useApiResource = <T>(
  fetcher: () => Promise<T>,
  dependencies: unknown[] = [],
  options: { enabled?: boolean } = {},
): UseApiResourceResult<T> => {
  const { enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      setErrorStatus(null);

      try {
        const result = await fetcherRef.current();

        if (!cancelled) {
          setData(result);
        }
      } catch (caught) {
        if (!cancelled) {
          setData(null);
          setError(caught instanceof ApiError ? caught.message : 'The data could not be loaded.');
          setErrorStatus(caught instanceof ApiError ? caught.status : null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reloadToken, enabled]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, isLoading, error, errorStatus, refresh, setData };
};
