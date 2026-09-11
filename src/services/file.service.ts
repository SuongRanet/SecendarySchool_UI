import { api, http } from './api';

/** What the server returns after storing a homework attachment. */
export interface UploadedFile {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** Everything a phone camera or a file picker may offer, for the input's `accept`. */
export const HOMEWORK_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  '.doc',
  '.docx',
  '.txt',
].join(',');

export const isImage = (mimeTypeOrName: string): boolean =>
  IMAGE_TYPES.includes(mimeTypeOrName) || /\.(jpe?g|png|webp|heic|heif)$/i.test(mimeTypeOrName);

/** Turns a byte count into something a Grade 7 pupil can read. */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** The name the student gave the file, recovered from the stored URL. */
export const fileNameFromUrl = (url: string): string => {
  const stored = url.slice(url.lastIndexOf('/') + 1);
  const separator = stored.indexOf('__');

  return separator === -1 ? stored : stored.slice(separator + 2);
};

export const fileService = {
  upload: (file: File, onProgress?: (percent: number) => void): Promise<UploadedFile> => {
    const form = new FormData();
    form.append('file', file);

    return api.post<UploadedFile>('/files/homework', form, {
      // Let the browser set the multipart boundary; a fixed JSON content type
      // here would make the body unparseable on the server.
      headers: { 'Content-Type': undefined },
      timeout: 120_000,
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
  },

  /**
   * Fetches an attachment as a blob URL.
   *
   * Attachments are behind the same authorisation as the record they hang off,
   * so they cannot simply be put in an `<img src>` — the browser would send no
   * token. Fetching through the API client and wrapping the result in an object
   * URL keeps the check server-side and still renders inline.
   */
  openUrl: async (url: string): Promise<string> => {
    const response = await http.get<Blob>(url, { responseType: 'blob' });

    return URL.createObjectURL(response.data);
  },
};
