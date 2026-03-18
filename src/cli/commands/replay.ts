import type { Command } from 'commander';
import { Database } from '../../storage/db.js';
import { loadConfig } from '../../server/config.js';
import { replay, recordToReplayRequest } from '../../server/replay.js';
import type { ReplayResponse } from '../../shared/types.js';
import pc from 'picocolors';

function formatReplayResponse(response: ReplayResponse, format: string): string {
  if (format === 'json') {
    return JSON.stringify({
      ...response,
      body: Buffer.from(response.body, 'base64').toString('utf-8'),
    }, null, 2);
  }

  const lines: string[] = [
    '',
    `  ${pc.dim('Status')}    ${response.status < 400 ? pc.green(String(response.status)) : pc.red(String(response.status))}`,
    `  ${pc.dim('Duration')}  ${response.duration}ms`,
    `  ${pc.dim('Size')}      ${response.size}B`,
    '',
    `  ${pc.bold('Response Headers')}`,
  ];

  for (const [key, value] of Object.entries(response.headers)) {
    const vals = Array.isArray(value) ? value : [value];
    for (const v of vals) {
      lines.push(`  ${pc.magenta(key)}${pc.dim(':')} ${v}`);
    }
  }

  const bodyStr = Buffer.from(response.body, 'base64').toString('utf-8');
  if (bodyStr) {
    lines.push('', `  ${pc.bold('Response Body')}`);
    let formatted = bodyStr;
    try { formatted = JSON.stringify(JSON.parse(bodyStr), null, 2); } catch {}
    lines.push(...formatted.split('\n').map(line => `  ${line}`));
  }

  lines.push('');
  return lines.join('\n');
}

export function registerReplay(program: Command): void {
  program
    .command('replay <id>')
    .description('Replay a captured request')
    .option('--method <method>', 'Override HTTP method')
    .option('--url <url>', 'Override URL')
    .option('--header <header...>', 'Override/add header (format: "Key: Value")')
    .option('--body <body>', 'Override body (raw string)')
    .option('--format <format>', 'Output format (json|table)', 'json')
    .option('--db-path <path>', 'Database path')
    .action(async (id, opts) => {
      const config = loadConfig(opts.dbPath ? { dbPath: opts.dbPath } : {});
      const db = new Database(config.dbPath);

      const record = db.getById(id);
      if (!record) {
        console.error(`Request ${id} not found.`);
        db.close();
        process.exit(1);
      }

      const request = recordToReplayRequest(record);

      // Apply overrides
      if (opts.method) request.method = opts.method;
      if (opts.url) request.url = opts.url;
      if (opts.header) {
        for (const h of opts.header as string[]) {
          const colonIdx = h.indexOf(':');
          if (colonIdx > 0) {
            const key = h.slice(0, colonIdx).trim();
            const value = h.slice(colonIdx + 1).trim();
            request.headers[key] = value;
          }
        }
      }
      if (opts.body) {
        request.body = Buffer.from(opts.body).toString('base64');
      }

      try {
        const response = await replay(request);
        console.log(formatReplayResponse(response, opts.format));
      } catch (err) {
        console.error(`Replay failed: ${(err as Error).message}`);
        process.exit(1);
      } finally {
        db.close();
      }
    });
}
