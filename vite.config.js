import { defineConfig } from 'vite';
import { resolve } from 'path';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

const cleanUrlsPlugin = () => ({
  name: 'clean-urls',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url.split('?')[0];
      const hasExtension = /\.[a-zA-Z0-9]+$/.test(url);
      
      if (!hasExtension) {
        if (url === '/team') {
          req.url = '/team.html' + req.url.substring(5);
        } else if (url === '/stay-connected') {
          req.url = '/stay-connected.html' + req.url.substring(15);
        } else if (url === '/past-events') {
          req.url = '/past-events.html' + req.url.substring(12);
        } else if (url === '/registration') {
          req.url = '/registration.html' + req.url.substring(13);
        } else if (url === '/channels') {
          req.url = '/channels.html' + req.url.substring(9);
        } else if (url === '/404') {
          req.url = '/404.html' + req.url.substring(4);
        } else if (url !== '/' && url !== '') {
          // Serve custom 404 page for any unmatched page routes
          req.url = '/404.html';
        }
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [
    cleanUrlsPlugin(),
    ViteImageOptimizer({
      png: {
        quality: 75,
      },
      jpeg: {
        quality: 75,
      },
      jpg: {
        quality: 75,
      },
      webp: {
        quality: 75,
      },
      svg: false
    })
  ],
  server: {
    watch: {
      ignored: [
        '**/*.crdownload',
        '**/*.tmp',
        '**/*.part',
        '**/node_modules/**',
        '**/shoe-finder/**'
      ]
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        connected: resolve(process.cwd(), 'stay-connected.html'),
        team: resolve(process.cwd(), 'team.html'),
        past: resolve(process.cwd(), 'past-events.html'),
        registration: resolve(process.cwd(), 'registration.html'),
        channels: resolve(process.cwd(), 'channels.html'),
        error: resolve(process.cwd(), '404.html')
      }
    }
  }
});
