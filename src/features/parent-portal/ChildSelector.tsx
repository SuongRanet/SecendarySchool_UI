import { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { parentService } from '@/services/people.service';
import type { ParentChild } from '@/types/entities';
import { useApiResource } from '@/hooks/useApiResource';
import { useSelectedChildStore } from '@/stores/child.store';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { cn } from '@/utils/cn';

export interface ChildScopeProps {
  /** Rendered once a child is selected. */
  children: (child: ParentChild) => ReactNode;
}

/**
 * Wraps a parent-portal page with the child switcher. A guardian with several
 * children changes subject here without signing out, and the choice persists
 * across pages.
 */
export const ChildScope = ({ children: render }: ChildScopeProps) => {
  const { t } = useTranslation(['dashboard', 'students']);
  const selectedId = useSelectedChildStore((state) => state.studentId);
  const setSelectedId = useSelectedChildStore((state) => state.setStudentId);

  const fetcher = useCallback(() => parentService.myChildren(), []);
  const children = useApiResource<ParentChild[]>(fetcher);

  useEffect(() => {
    if (!children.data || children.data.length === 0) {
      return;
    }

    const stillLinked = children.data.some((child) => child.studentId === selectedId);

    if (!stillLinked) {
      setSelectedId(children.data[0].studentId);
    }
  }, [children.data, selectedId, setSelectedId]);

  if (children.isLoading) {
    return <LoadingState />;
  }

  if (children.error) {
    return <ErrorState message={children.error} onRetry={children.refresh} />;
  }

  if (!children.data || children.data.length === 0) {
    return <EmptyState title={t('dashboard:parent.noChildren')} />;
  }

  const selected =
    children.data.find((child) => child.studentId === selectedId) ?? children.data[0];

  return (
    <div className="flex flex-col gap-5">
      {children.data.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.data.map((child) => {
            const isSelected = child.studentId === selected.studentId;

            return (
              <button
                key={child.studentId}
                type="button"
                onClick={() => setSelectedId(child.studentId)}
                aria-pressed={isSelected}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 transition-colors',
                  isSelected
                    ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]',
                )}
              >
                <Avatar name={child.fullName} src={child.profilePhoto} size="xs" />
                <span className="text-sm font-medium">{child.fullName}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {render(selected)}
    </div>
  );
};
