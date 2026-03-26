import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BUCKET_FILES = 'kandidaat-bestanden';       // Zone A: foto, CV
const BUCKET_VERIFICATION = 'kandidaat-verificatie'; // Zone C: ID-scans
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const SIGNED_URL_FILES = 60 * 60;       // 1 uur voor reguliere bestanden
const SIGNED_URL_VERIFICATION = 5 * 60; // 5 minuten voor ID-scans
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

    // ID-scans go to separate high-security bucket (Zone C)
    const isVerification = folder === 'id-scan';
    const bucket = isVerification ? BUCKET_VERIFICATION : BUCKET_FILES;
    const signedUrlDuration = isVerification ? SIGNED_URL_VERIFICATION : SIGNED_URL_FILES;

    setUploading(true);
    try {
      const ext = rawExt;
      const timestamp = Date.now();
      // Use UUID-only paths for verification docs (no names/BSN in path)
      const docId = crypto.randomUUID();
      const path = isVerification
        ? `${kandidaatId}/${docId}.${ext}`
        : `${kandidaatId}/${folder}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Always use signed URLs — never expose public URLs
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, signedUrlDuration);

      if (signedError || !signedData?.signedUrl) {
        throw new Error('Kon geen beveiligde URL aanmaken voor het bestand');
      }

      // Prefix path with bucket name for later retrieval
      const storagePath = isVerification ? `verification:${path}` : path;

      return { path: storagePath, publicUrl: signedData.signedUrl };
    } finally {
      setUploading(false);
    }
  };

  const remove = async (path: string) => {
    const isVerification = path.startsWith('verification:');
    const bucket = isVerification ? BUCKET_VERIFICATION : BUCKET_FILES;
    const cleanPath = isVerification ? path.replace('verification:', '') : path;
    const { error } = await supabase.storage.from(bucket).remove([cleanPath]);
    if (error) throw error;
  };

  const getSignedUrl = async (path: string): Promise<string | null> => {
    if (!path) return null;
    const isVerification = path.startsWith('verification:');
    const bucket = isVerification ? BUCKET_VERIFICATION : BUCKET_FILES;
    const cleanPath = isVerification ? path.replace('verification:', '') : path;
    const duration = isVerification ? SIGNED_URL_VERIFICATION : SIGNED_URL_FILES;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(cleanPath, duration);
    if (error) return null;
    return data.signedUrl;
  };

  return { upload, remove, getSignedUrl, uploading };
}
