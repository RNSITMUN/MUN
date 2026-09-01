import { defineConfig } from 'vite';
import { resolve } from 'path';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

import createSheetHandler from './api/create-sheet.js';
import submitRegistrationHandler from './api/submit-registration.js';
import checkEmailHandler from './api/check-email.js';

const cleanUrlsPlugin = () => ({
  name: 'clean-urls',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const [urlPath, queryString] = req.url.split('?');
      const url = urlPath;

      const handleApiRequest = (handler) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            req.body = body ? JSON.parse(body) : {};
          } catch (e) {
            req.body = {};
          }
          if (queryString) {
            const params = new URLSearchParams(queryString);
            req.query = Object.fromEntries(params.entries());
          } else {
            req.query = {};
          }
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };
          try {
            await handler(req, res);
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      };

      if (url === '/api/create-sheet') {
        return handleApiRequest(createSheetHandler);
      }
      if (url === '/api/submit-registration') {
        return handleApiRequest(submitRegistrationHandler);
      }
      if (url === '/api/check-email') {
        return handleApiRequest(checkEmailHandler);
      }

      const hasExtension = /\.[a-zA-Z0-9]+$/.test(url);
      
      if (!hasExtension) {
        if (url === '/team' || url === '/teams') {
          req.url = '/team.html';
        } else if (url === '/stay-connected') {
          req.url = '/stay-connected.html' + req.url.substring(15);
        } else if (url === '/contact') {
          req.url = '/stay-connected.html' + req.url.substring(8);
        } else if (url === '/past-events') {
          req.url = '/past-events.html' + req.url.substring(12);
        } else if (url === '/registration') {
          req.url = '/registration.html' + req.url.substring(13);
        } else if (url === '/channels') {
          req.url = '/channels.html' + req.url.substring(9);
        } else if (url === '/code-of-conduct' || url === '/coc') {
          req.url = '/code-of-conduct.html';
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
        coc: resolve(process.cwd(), 'code-of-conduct.html'),
        error: resolve(process.cwd(), '404.html')
      }
    }
  }
});
