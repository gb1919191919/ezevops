import { supabase } from './client';

export type OpsMediaFolder = 'job-cards' | 'inspections' | 'shift-logs' | 'tasks' | 'sops' | 'notes';

export interface UploadMediaResult {
  url: string | null;
  path: string | null;
  error: Error | null;
}

// SECURITY (MED-10): Allowed MIME types and max size limits (10MB)
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Uploads a media asset or document to the ops-media Supabase Storage bucket.
 * Validates file MIME type, size limit, and sanitizes storage path.
 * Returns the public CDN URL for persistent reference.
 */
export async function uploadOpsMedia(
  file: File,
  folder: OpsMediaFolder = 'job-cards'
): Promise<UploadMediaResult> {
  try {
    // 1. Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of 10MB.`);
    }

    // 2. Validate MIME Type
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      throw new Error(`File type "${file.type}" is not supported. Please upload images (JPEG, PNG, WebP) or documents (PDF, CSV, TXT).`);
    }

    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanBaseName = file.name.substring(0, file.name.lastIndexOf('.') || file.name.length)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);

    const storagePath = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanBaseName}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('ops-media')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('ops-media')
      .getPublicUrl(data.path);

    return {
      url: publicUrlData.publicUrl,
      path: data.path,
      error: null,
    };
  } catch (err: any) {
    console.error('Ops Media Storage upload failure:', err);
    return {
      url: null,
      path: null,
      error: err,
    };
  }
}
