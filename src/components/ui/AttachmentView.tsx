import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, ImageIcon } from 'lucide-react';
import { fileService, fileNameFromUrl, isImage } from '@/services/file.service';
import { Spinner } from './Spinner';

interface AttachmentViewProps {
  url: string;
  /** Renders the thumbnail small enough to sit inside a table row. */
  compact?: boolean;
}

/**
 * Shows an attachment that sits behind the API's authorisation.
 *
 * The file cannot go straight into an `<img src>` — the browser sends no bearer
 * token — so it is fetched through the API client and wrapped in an object URL.
 * That URL is revoked when the component goes away, otherwise a teacher paging
 * through thirty submissions would leak thirty photographs' worth of memory.
 */
export const AttachmentView = ({ url, compact }: AttachmentViewProps) => {
  const { t } = useTranslation(['engagement', 'common']);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const name = fileNameFromUrl(url);
  const image = isImage(name);

  useEffect(() => {
    let revoked = false;
    let created: string | null = null;

    fileService
      .openUrl(url)
      .then((next) => {
        if (revoked) {
          URL.revokeObjectURL(next);
          return;
        }

        created = next;
        setObjectUrl(next);
      })
      .catch(() => setFailed(true));

    return () => {
      revoked = true;

      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [url]);

  if (failed) {
    return <p className="text-xs text-[var(--danger)]">{t('common:toast.failed')}</p>;
  }

  if (!objectUrl) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-[var(--text-subtle)]">
        <Spinner size="sm" />
        {name}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {image ? (
        <a href={objectUrl} target="_blank" rel="noreferrer" className="block">
          <img
            src={objectUrl}
            alt={name}
            className={`rounded-lg border border-[var(--border)] object-contain ${
              compact ? 'max-h-24' : 'max-h-80 w-full'
            }`}
          />
        </a>
      ) : null}

      <a
        href={objectUrl}
        download={name}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
      >
        {image ? (
          <ImageIcon className="size-4" aria-hidden="true" />
        ) : (
          <FileText className="size-4" aria-hidden="true" />
        )}
        <span className="truncate">{name}</span>
        <Download className="size-3.5 shrink-0" aria-hidden="true" />
      </a>
    </div>
  );
};
