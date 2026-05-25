import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
    'process.env.GEMINI_API_KEY_2': JSON.stringify(process.env.GEMINI_API_KEY_2),
    'process.env.GEMINI_API_KEY_3': JSON.stringify(process.env.GEMINI_API_KEY_3),
    'process.env.OPENROUTER_API_KEY': JSON.stringify(process.env.OPENROUTER_API_KEY)
  },
  optimizeDeps: {
    force: true,
  }
});

