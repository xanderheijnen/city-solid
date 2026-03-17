import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'kandidaat-bestanden';

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
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const timestamp = Date.now();
      const path = `${kandidaatId}/${folder}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

      // For private buckets, use signed URL instead
      const { data: signedData, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year signed URL

      const url = signedData?.signedUrl ?? data.publicUrl;

      return { path, publicUrl: url };
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
