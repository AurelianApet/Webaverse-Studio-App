import path from 'path';
import http from 'http';
import https from 'https';
import fs from 'fs';
import child_process from 'child_process';
import express from 'express';
import * as vite from 'vite';
import wsrtc from 'wsrtc/wsrtc-server.mjs';

const SERVER_ADDR = '0.0.0.0';
const SERVER_NAME = 'local.webaverse.com';

const COMPILER_PORT = 3333;
const COMPILER_NAME = 'local-compiler.webaverse.com';

Error.stackTraceLimit = 300;

const isProduction = process.argv[2] === '-p';

const _tryReadFile = p => {
  try {
    return fs.readFileSync(p);
  } catch(err) {
    // console.warn(err);
    return null;
  }
};
const certs = {
  key: _tryReadFile('./certs/privkey.pem') || _tryReadFile('./certs-local/privkey.pem'),
  cert: _tryReadFile('./certs/fullchain.pem') || _tryReadFile('./certs-local/fullchain.pem'),
};

function makeId(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const _proxy = (req, res, u) => {
  const proxyReq = /^https:/.test(u) ? https.request(u) : http.request(u);
  for (const header in req.headers) {
    proxyReq.setHeader(header, req.headers[header]);
  }
  proxyReq.on('response', proxyRes => {
    for (const header in proxyRes.headers) {
      res.setHeader(header, proxyRes.headers[header]);
    }
    res.statusCode = proxyRes.statusCode;
    proxyRes.pipe(res);
  });
  proxyReq.on('error', err => {
    console.error(err);
    res.statusCode = 500;
    res.end();
  });
  proxyReq.end();
};

const _startCompiler = () => new Promise((resolve, reject) => {
  // start the compiler at ./packages/compiler
  const dirname = path.dirname(import.meta.url.replace(/^file:\/\//, ''));
  const compilerPath = path.join(dirname, 'packages', 'compiler');
  const nextPath = path.join(compilerPath, 'node_modules', '.bin', 'next');
  const compilerProcess = child_process.spawn(process.argv[0], [nextPath, 'dev'], {
    cwd: compilerPath,
    env: {
      // ...process.env,
      PORT: COMPILER_PORT,
      BASE_CWD: dirname,
    },
  });
  compilerProcess.on('error', err => {
    console.warn(err);
  });
  let accepted = false;
  compilerProcess.stdout.setEncoding('utf8');
  compilerProcess.stdout.on('data', data => {
    // console.log(data.toString());
    if (!accepted && /ready/.test(data)) {
      accepted = true;
      resolve();
    }
  });
  compilerProcess.stderr.on('data', data => {
    // console.warn(data.toString());
  });
  compilerProcess.on('close', code => {
    console.log(`compiler process exited with code ${code}`);
  });
});

(async () => {
  const app = express();
  app.all('*', async (req, res, next) => {
    // console.log('got headers', req.method, req.url, req.headers);

    if (req.headers['host'] === COMPILER_NAME) {
      const u = `http://localhost:${COMPILER_PORT}${req.url}`;
      _proxy(req, res, u);
      return;
    } else {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      next();
    }
  });

  const isHttps = !process.env.HTTP_ONLY && (!!certs.key && !!certs.cert);
  const port = parseInt(process.env.PORT, 10) || (isProduction ? 443 : 3000);
  const wsPort = port + 1;

  const _makeHttpServer = () => isHttps ? https.createServer(certs, app) : http.createServer(app);
  const httpServer = _makeHttpServer();
  const viteServer = await vite.createServer({
    server: {
      middlewareMode: true,
      // force: true,
      hmr: {
        server: httpServer,
        port,
        overlay: false,
      },
    }
  });
  app.use(viteServer.middlewares);
  
  await _startCompiler();
  await new Promise((accept, reject) => {
    httpServer.listen(port, SERVER_ADDR, () => {
      accept();
    });
    httpServer.on('error', reject);
  });
  console.log(`  > Local: http${isHttps ? 's' : ''}://${SERVER_NAME}:${port}/`);
  
  const wsServer = (() => {
    if (isHttps) {
      return https.createServer(certs);
    } else {
      return http.createServer();
    }
  })();
  const initialRoomState = (() => {
    const s = fs.readFileSync('./scenes/gunroom.scn', 'utf8');
    const j = JSON.parse(s);
    const {objects} = j;
    
    const appsMapName = 'apps';
    const result = {
      [appsMapName]: [],
    };
    for (const object of objects) {
      let {start_url, type, content, position = [0, 0, 0], quaternion = [0, 0, 0, 1], scale = [1, 1, 1]} = object;

      const transform = Float32Array.from([...position, ...quaternion, ...scale]);
      const instanceId = makeId(5);
      if (!start_url && type && content) {
        start_url = `data:${type},${encodeURI(JSON.stringify(content))}`;
      }
      const appObject = {
        instanceId,
        contentId: start_url,
        transform,
        components: JSON.stringify([]),
      };
      result[appsMapName].push(appObject);
    }
    return result;
  })();
  const initialRoomNames = [];
  wsrtc.bindServer(wsServer, {
    initialRoomState,
    initialRoomNames,
  });
  await new Promise((accept, reject) => {
    wsServer.listen(wsPort, SERVER_ADDR, () => {
      accept();
    });
    wsServer.on('error', reject);
  });
  console.log(`  > World: ws${isHttps ? 's' : ''}://${SERVER_NAME}:${wsPort}/`);
})();
