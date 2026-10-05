import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5271, proxy: { '/api': 'http://localhost:8090', '/uploads': 'http://localhost:8090', '/apresentacao': 'http://localhost:8090', '^/inteligencia/[0-9]+': 'http://localhost:8090' } },
});
