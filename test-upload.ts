import { uploadImage } from './services/supabase.ts';

async function test() {
  try {
    const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const url = await uploadImage(base64);
    console.log('URL:', url);
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
  }
}
test();
