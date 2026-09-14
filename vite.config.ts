import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function rawFilePlugin(): Plugin {
  return {
    name: 'raw-file-server',
    configureServer(server) {
      server.middlewares.use('/api/raw-file', (req, res) => {
        try {
          const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
          const filePath = url.searchParams.get('path');
          if (!filePath || filePath.includes('..')) {
            res.statusCode = 400;
            return res.end('Invalid path');
          }
          const fullPath = path.resolve(__dirname, filePath);
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            return res.end(fs.readFileSync(fullPath, 'utf-8'));
          }
          res.statusCode = 404;
          return res.end('File not found');
        } catch (err: any) {
          res.statusCode = 500;
          return res.end(err?.message || 'Server error');
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), rawFilePlugin()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
