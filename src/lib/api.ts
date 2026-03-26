/**
 * API helper — routes sensitive requests through the Python backend.
 * Zone A (public data) goes directly to Supabase.
 * Zone B + C (sensitive data, ID-scans) go through this API layer.
 */
import { supabase } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Authenticated fetch to the backend API.
 * Automatically attaches the Supabase JWT token.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Niet ingelogd');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error ${res.status}`);
  }

  return res.json();
}

/**
 * Upload a file to the backend (multipart/form-data).
 */
export async function apiUpload<T = unknown>(
  path: string,
  file: File,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Niet ingelogd');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Upload error ${res.status}`);
  }

  return res.json();
}
