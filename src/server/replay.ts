import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import type { ReplayRequest, ReplayResponse, RequestRecord } from '../shared/types.js';

const REPLAY_TIMEOUT = 30_000;

const SKIP_HEADERS = new Set([
  'proxy-connection', 'proxy-authorization', 'connection',
  'keep-alive', 'transfer-encoding', 'upgrade',
]);

export function recordToReplayRequest(record: RequestRecord): ReplayRequest {
  const rawHeaders: Record<string, string | string[]> = JSON.parse(record.request_headers || '{}');
  const headers: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (!SKIP_HEADERS.has(key.toLowerCase())) {
      headers[key] = value;
    }
  }
  return {
    url: record.url,
    method: record.method,
    headers,
    body: record.request_body ? Buffer.from(record.request_body).toString('base64') : undefined,
  };
}

export function replay(request: ReplayRequest): Promise<ReplayResponse> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(request.url);
    } catch {
      reject(new Error(`Invalid URL: ${request.url}`));
      return;
    }

    const isHttps = parsed.protocol === 'https:';
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      reject(new Error(`Unsupported protocol: ${parsed.protocol}`));
      return;
    }

    const headers = { ...request.headers };
    delete headers['accept-encoding'];
    delete headers['proxy-connection'];
    headers['host'] = parsed.host;

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: request.method,
      headers,
      timeout: REPLAY_TIMEOUT,
      ...(isHttps ? { rejectUnauthorized: false } : {}),
    };

    const startTime = Date.now();
    const transport = isHttps ? https : http;

    const req = transport.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          status: res.statusCode || 0,
          headers: res.headers as Record<string, string | string[]>,
          body: body.toString('base64'),
          duration: Date.now() - startTime,
          size: body.length,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.on('error', (err) => {
      reject(new Error(`Connection failed: ${err.message}`));
    });

    if (request.body) {
      req.write(Buffer.from(request.body, 'base64'));
    }
    req.end();
  });
}
