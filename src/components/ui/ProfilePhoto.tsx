import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Trash2 } from 'lucide-react';
import { useMutation } from '@/hooks/useMutation';
import { toast } from '@/stores/toast.store';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
const ALLOWED = /\.(jpe?g|png|webp|heic|heif)$/i;
const MAX_BYTES = 5 * 1024 * 1024;

export interface ProfilePhotoProps {
  name: string;
  src: string | null;
  /** Without this the photo is shown read-only. */
  canEdit?: boolean;
  onUpload: (file: File) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
}

/**
 * A person's portrait with upload, replace and remove controls.
 *
 * The file is checked here for a quick answer; the server checks it again, and
 * the permission behind `canEdit` is enforced there too.
 */
export const ProfilePhoto = ({ name, src, canEdit = false, onUpload, onRemove }: ProfilePhotoProps) => {
  const { t } = useTranslation('common');
  const { run, isRunning } = useMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the input so choosing the same file again still fires a change.
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!ALLOWED.test(file.name)) {
      toast.error(t('photo.wrongType'));
      return;
    }

    if (file.size > MAX_BYTES) {
      toast.error(t('photo.tooLarge'));
      return;
    }

    await run(() => onUpload(file), t('photo.uploaded'));
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Keyed on the URL so a new photo retries after an earlier load failed. */}
      <Avatar key={src ?? 'none'} name={name} src={src} size="xl" className="size-24 text-2xl" />

      {canEdit ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleFile}
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Camera className="size-4" />}
              isLoading={isRunning}
              loadingText={t('photo.uploading')}
              onClick={() => inputRef.current?.click()}
            >
              {src ? t('photo.change') : t('photo.upload')}
            </Button>
            {src ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Trash2 className="size-4" />}
                disabled={isRunning}
                onClick={() => setConfirmOpen(true)}
                aria-label={t('photo.remove')}
              >
                {t('photo.remove')}
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-[var(--text-muted)]">{t('photo.hint')}</p>

          <ConfirmDialog
            open={isConfirmOpen}
            title={t('photo.removeTitle')}
            message={t('photo.removeMessage')}
            icon="delete"
            confirmLabel={t('photo.remove')}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={async () => {
              const removed = await run(onRemove, t('photo.removed'));

              if (removed) {
                setConfirmOpen(false);
              }
            }}
          />
        </>
      ) : null}
    </div>
  );
};
