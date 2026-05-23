import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string, viteKey: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key] as string;
  if (typeof process !== 'undefined' && process.env && process.env[viteKey]) return process.env[viteKey] as string;
  try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env) {
          // @ts-ignore
          return import.meta.env[viteKey] as string;
      }
  } catch(e) {}
  return '';
};

// Vite static replacements needs direct access format like import.meta.env.VITE_SUPABASE_URL
// For that to work, we must avoid wrapping it in too much abstraction for Vite
let supabaseUrl = typeof process !== 'undefined' && process.env.SUPABASE_URL ? process.env.SUPABASE_URL : (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL : '');
let supabaseKey = typeof process !== 'undefined' && process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY : (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY ? process.env.VITE_SUPABASE_ANON_KEY : '');

if (!supabaseUrl) {
  try {
    // @ts-ignore
    supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  } catch(e) {}
}

if (!supabaseKey) {
  try {
    // @ts-ignore
    supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  } catch(e) {}
}

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl as string, supabaseKey as string) 
  : null as any;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL and Anon Key are required. Please check your environment variables.');
}

/**
 * Uploads an image to Supabase Storage and returns the public URL.
 * @param file The file to upload (File object or base64 string)
 * @returns The public URL of the uploaded image
 */
export const uploadImage = async (file: File | Blob | string): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  try {
    let fileBody: any = file;
    let fileName = `image-${Date.now()}.jpg`;
    let contentType = 'image/jpeg';

    if (typeof file === 'string' && file.startsWith('data:')) {
      // Handle base64 string
      const response = await fetch(file);
      const blob = await response.blob();
      fileBody = blob;
      contentType = blob.type;
      const extension = contentType.split('/')[1] || 'jpg';
      fileName = `image-${Date.now()}.${extension}`;
    } else if (file instanceof File) {
      fileName = `${Date.now()}-${file.name}`;
      contentType = file.type;
    }

    const { data, error } = await supabase.storage
      .from('news-images')
      .upload(fileName, fileBody, {
        contentType,
        upsert: true
      });

    if (error) {
      if (error.message?.includes('violates row-level security policy')) {
        console.error('SUPABASE STORAGE ERROR: Row-Level Security (RLS) policy violation.');
        console.info('To fix this, go to your Supabase Dashboard -> Storage -> Buckets -> news-images -> Policies.');
        console.info('Add a policy for "INSERT" that allows "Public" or "Authenticated" users to upload files.');
        // We throw a specific error that can be caught and handled gracefully
        const rlsError = new Error('Storage Permission Denied: Please configure RLS policies for the "news-images" bucket in Supabase.');
        (rlsError as any).isRlsError = true;
        throw rlsError;
      }
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('news-images')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image to Supabase:', error);
    throw error;
  }
};
