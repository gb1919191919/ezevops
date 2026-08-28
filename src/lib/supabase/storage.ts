import { supabase } from './client';

export type OpsMediaFolder = 'job-cards' | 'inspections' | 'shift-logs' | 'tasks' | 'sops' | 'notes';

export interface UploadMediaResult {
  url: string | null;
  path: string | null;
  error: Error | null;
}

/**
 * Uploads a media asset or document to the ops-media Supabase Storage bucket.
 * Returns the public CDN URL for persistent reference.
 */
export async function uploadOpsMedia(
  file: File,
  folder: OpsMediaFolder = 'job-cards'
): Promise<UploadMediaResult> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from('ops-media')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
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
