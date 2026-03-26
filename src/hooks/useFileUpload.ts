import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'kandidaat-bestanden';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',  // images
  'pdf', 'doc', 'docx', 'odt',                   // documents
  'xls', 'xlsx', 'csv',                           // spreadsheets
]);

interface UploadResult {
  path: string;
  publicUrl: string;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = async (
    file: File,
    kandidaatId: string,
    folder: 'foto' | 'id-scan' | 'cv',
  ): Promise<UploadResult> => {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Bestand is te groot (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`);
    }

    // Validate & sanitize file extension
    const rawExt = (file.name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!rawExt || !ALLOWED_EXTENSIONS.has(rawExt)) {
      throw new Error(`Bestandstype .${rawExt || '?'} is niet toegestaan`);
    }

    setUploading(true);
    try {
      const ext = rawExt;
      const timestamp = Date.now();
      const path = `${kandidaatId}/${folder}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Always use signed URLs for private bucket — never expose public URLs
      const { data: signedData, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60); // 1 hour signed URL

      if (signedError || !signedData?.signedUrl) {
        throw new Error('Kon geen beveiligde URL aanmaken voor het bestand');
      }

      return { path, publicUrl: signedData.signedUrl };
    } finally {
      setUploading(false);
    }
  };

  const remove = async (path: string) => {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  };

  const getSignedUrl = async (path: string): Promise<string | null> => {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60); // 1 hour
    if (error) return null;
    return data.signedUrl;
  };

  return { upload, remove, getSignedUrl, uploading };
}
