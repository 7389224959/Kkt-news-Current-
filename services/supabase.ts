import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env[key]) {
    return process.env[key];
  }
  try {
    // Statically replaceable by Vite
    // @ts-ignore
    if (key === 'VITE_SUPABASE_URL' && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) {
      // @ts-ignore
      return import.meta.env.VITE_SUPABASE_URL;
    }
    // @ts-ignore
    if (key === 'VITE_SUPABASE_ANON_KEY' && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
  } catch (e) {
    // Ignore
  }
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith('http')) {
  console.error('Supabase URL and Anon Key are required and URL must be valid. Please check your environment variables.');
}

export let supabase: any = null;
try {
  if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch(e) {
  console.error('Failed to initialize Supabase client:', e);
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
