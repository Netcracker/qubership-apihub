// Small HTTP helpers for the dev server's mock routes.

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { MockResponse } from './scenarios/types.ts';

export const JSON_TYPE = 'application/json; charset=utf-8';
const TEXT_TYPE = 'text/plain; charset=utf-8';

export function send(res: ServerResponse, status: number, body: string, type = TEXT_TYPE) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function respondMock(res: ServerResponse, result: MockResponse) {
  if (result.delayMs) await delay(result.delayMs);
  if (result.destroy) {
    res.socket?.destroy();
    return;
  }
  // GitHub answers errors in JSON too, such as 401 Bad credentials; plain text stays plain text.
  send(res, result.status, result.body, /^\s*[[{]/.test(result.body) ? JSON_TYPE : TEXT_TYPE);
}
