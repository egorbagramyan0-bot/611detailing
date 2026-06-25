import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Manually parse local .env file during development (avoids dependency on dotenv)
const loadLocalEnv = () => {
  const envPath = resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index === -1) return;
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      // Remove surrounding quotes if any
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    });
  }
};

loadLocalEnv();

export default defineConfig({
  plugins: [
    {
      name: 'api-serverless-dev',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const urlPath = req.url.split('?')[0];
          if (urlPath === '/api/send-telegram' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', async () => {
              try {
                // Clear module cache to allow hot reloading of the API handler during development
                const handlerPath = resolve(__dirname, './api/send-telegram.js');
                delete require.cache[handlerPath];
                const handler = require('./api/send-telegram.js');

                // Mock request and response objects for Vercel Serverless Function compatibility
                const mockReq = {
                  method: 'POST',
                  body: JSON.parse(body),
                  headers: req.headers
                };

                const mockRes = {
                  status(code) {
                    res.statusCode = code;
                    return this;
                  },
                  json(obj) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(obj));
                    return this;
                  },
                  setHeader(name, value) {
                    res.setHeader(name, value);
                    return this;
                  }
                };

                await handler(mockReq, mockRes);
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Ошибка обработки запроса на сервере.' }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        wash: resolve(__dirname, 'wash.html'),
        polish: resolve(__dirname, 'polish.html'),
        ceramic: resolve(__dirname, 'ceramic.html'),
        wrap: resolve(__dirname, 'wrap.html'),
        'dry-clean': resolve(__dirname, 'dry-clean.html'),
        leather: resolve(__dirname, 'leather.html'),
        prep: resolve(__dirname, 'prep.html'),
      },
    },
  },
});
