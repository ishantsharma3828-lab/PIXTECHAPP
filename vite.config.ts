import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
    },
    plugins: [
      react({
        // WatermelonDB uses ECMAScript decorators (legacy mode).
        // These Babel transforms are required for Model class decorators
        // (@text, @field, @date, etc.) to compile correctly in Vite.
        babel: {
          plugins: [
            ['@babel/plugin-proposal-decorators', { legacy: true }],
            ['@babel/plugin-proposal-class-properties', { loose: true }],
          ],
        },
      }),
      tailwindcss(),
    ],
    define: {
      'process.env.API_KEY':         JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY':  JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      // WatermelonDB's LokiJS adapter uses CommonJS internally; tell Vite to pre-bundle it.
      include: ['@nozbe/watermelondb'],
    },
  };
});
