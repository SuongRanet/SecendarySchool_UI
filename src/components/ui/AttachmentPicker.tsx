import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, ImageIcon, Paperclip, X } from 'lucide-react';
import { fileService, formatFileSize, isImage, HOMEWORK_ACCEPT } from '@/services/file.service';
import type { UploadedFile } from '@/services/file.service';
import { ApiError } from '@/types/api';
import { Button } from './Button';

interface AttachmentPickerProps {
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  disabled?: boolean;
}

/**
 * Picking a file and uploading it before the surrounding form is saved.
 *
 * Grades 7 to 9 hand work in from a phone far more often than from a desktop, so
 * the control is a large tap target, the camera is offered directly, and the
 * chosen photograph is shown back at once — a pupil who has just photographed
 * the wrong page needs to see that before they hand it in, not after.
 *
 * The upload happens on selection rather than on submit so the progress bar has
 * somewhere to live and a slow connection does not look like a frozen button.
 */
export const AttachmentPicker = ({ value, onChange, disabled }: AttachmentPickerProps) => {
  const { t } = useTranslation(['studentPortal', 'common']);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [progress, setProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(null);
    setProgress(null);
    onChange(null);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setProgress(0);

    // A local preview costs nothing and appears immediately, where waiting for
    // the round trip would leave the pupil staring at a bar.
    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file));
    }

    try {
      const uploaded = await fileService.upload(file, setProgress);
      onChange(uploaded);
      setProgress(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
      reset();
    }
  };

  const isUploading = progress !== null;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={HOMEWORK_ACCEPT}
        className="sr-only"
        disabled={disabled || isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void handleFile(file);
          }
        }}
      />

      {value === null ? (
        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={disabled || isUploading}
          isLoading={isUploading}
          leftIcon={<Paperclip className="size-4" />}
          onClick={() => inputRef.current?.click()}
        >
          {t('studentPortal:homework.attachFile')}
        </Button>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          {preview ? (
            <img
              src={preview}
              alt=""
              className="size-14 shrink-0 rounded-md object-cover"
            />
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary)]">
              {isImage(value.mimeType) ? (
                <ImageIcon className="size-6" aria-hidden="true" />
              ) : (
                <FileText className="size-6" aria-hidden="true" />
              )}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text)]">{value.fileName}</p>
            <p className="text-xs text-[var(--text-subtle)]">{formatFileSize(value.sizeBytes)}</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t('studentPortal:homework.removeFile')}
            onClick={reset}
            disabled={disabled}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {isUploading ? (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]"
          role="progressbar"
          aria-valuenow={progress ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-[var(--primary)] transition-[width] duration-200"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
      ) : null}

      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}

      <p className="text-xs text-[var(--text-subtle)]">{t('studentPortal:homework.attachHint')}</p>
    </div>
  );
};
