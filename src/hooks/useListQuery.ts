import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError } from '@/types/api';
import type { PaginatedData, PaginationMeta } from '@/types/api';

export interface ListQueryState {
  page: number;
  limit: number;
  search: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters: Record<string, string>;
}

export interface UseListQueryOptions<T> {
  /** Fetches one page. Receives the fully resolved query state. */
  fetcher: (query: ListQueryState) => Promise<PaginatedData<T>>;
  /** Filter keys that participate in URL sync. */
  filterKeys?: string[];
  defaultLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  /** Persist the query state in the URL so a list view can be bookmarked. */
  syncToUrl?: boolean;
}

export interface UseListQueryResult<T> {
  rows: T[];
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
  query: ListQueryState;
  isFiltered: boolean;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setFilter: (key: string, value: string) => void;
  clearFilters: () => void;
  refresh: () => void;
}

const EMPTY_PAGINATION: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

/**
 * Drives a server-paginated list page: pagination, debounced search, sorting and
 * filters, all kept in the URL so the view can be shared or restored on reload.
 * Filtering is never done in the browser — the query goes to the API.
 */
export const useListQuery = <T>({
  fetcher,
  filterKeys = [],
  defaultLimit = 20,
  defaultSortBy,
  defaultSortOrder = 'desc',
  syncToUrl = true,
}: UseListQueryOptions<T>): UseListQueryResult<T> => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localState, setLocalState] = useState<ListQueryState>(() => ({
    page: 1,
    limit: defaultLimit,
    search: '',
    sortBy: defaultSortBy,
    sortOrder: defaultSortOrder,
    filters: {},
  }));

  const query = useMemo<ListQueryState>(() => {
    if (!syncToUrl) {
      return localState;
    }

    const filters: Record<string, string> = {};

    for (const key of filterKeys) {
      const value = searchParams.get(key);

      if (value) {
        filters[key] = value;
      }
    }

    return {
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || defaultLimit,
      search: searchParams.get('search') ?? '',
      sortBy: searchParams.get('sortBy') ?? defaultSortBy,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc' | null) ?? defaultSortOrder,
      filters,
    };
    // `filterKeys` is a literal array at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, localState, syncToUrl, defaultLimit, defaultSortBy, defaultSortOrder]);

  const [rows, setRows] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    ...EMPTY_PAGINATION,
    limit: defaultLimit,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const queryKey = JSON.stringify(query);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetcherRef.current(JSON.parse(queryKey) as ListQueryState);

        if (!cancelled) {
          setRows(result.items);
          setPagination(result.pagination);
        }
      } catch (caught) {
        if (!cancelled) {
          setRows([]);
          setError(
            caught instanceof ApiError ? caught.message : 'The data could not be loaded.',
          );
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
  }, [queryKey, reloadToken]);

  const commit = useCallback(
    (next: Partial<ListQueryState> & { resetPage?: boolean }) => {
      const { resetPage = true, ...patch } = next;

      if (!syncToUrl) {
        setLocalState((current) => ({
          ...current,
          ...patch,
          filters: patch.filters ?? current.filters,
          page: patch.page ?? (resetPage ? 1 : current.page),
        }));
        return;
      }

      setSearchParams(
        (params) => {
          const updated = new URLSearchParams(params);
          const merged: Record<string, string | undefined> = {
            page: String(patch.page ?? (resetPage ? 1 : query.page)),
            limit: String(patch.limit ?? query.limit),
            search: patch.search ?? query.search,
            sortBy: patch.sortBy ?? query.sortBy,
            sortOrder: patch.sortOrder ?? query.sortOrder,
            ...(patch.filters ?? query.filters),
          };

          for (const key of ['page', 'limit', 'search', 'sortBy', 'sortOrder', ...filterKeys]) {
            const value = merged[key];

            if (value === undefined || value === '' || value === 'undefined') {
              updated.delete(key);
            } else {
              updated.set(key, value);
            }
          }

          return updated;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, setSearchParams, syncToUrl],
  );

  const isFiltered =
    query.search.trim().length > 0 || Object.values(query.filters).some((value) => value !== '');

  return {
    rows,
    pagination,
    isLoading,
    error,
    query,
    isFiltered,
    setPage: (page) => commit({ page, resetPage: false }),
    setLimit: (limit) => commit({ limit }),
    setSearch: (search) => commit({ search }),
    setSort: (sortBy, sortOrder) => commit({ sortBy, sortOrder, resetPage: false }),
    setFilter: (key, value) =>
      commit({ filters: { ...query.filters, [key]: value } }),
    clearFilters: () =>
      commit({
        search: '',
        filters: Object.fromEntries(filterKeys.map((key) => [key, ''])),
      }),
    refresh: () => setReloadToken((token) => token + 1),
  };
};
