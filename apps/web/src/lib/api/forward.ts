import type { NextRequest } from 'next/server';
import { SANDBOX_COOKIE } from './sandbox';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type', 'idempotency-key'];
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'content-disposition'];

/**
 * Backend-for-frontend hop. The browser only ever talks to this origin, so there is
 * no CORS, the sandbox cookie stays httpOnly, and `API_URL` is read at runtime.
 * `no-transform` keeps the proxy from buffering the Server-Sent Events stream.
 */
export async function forwardToApi(request: NextRequest, upstreamPath: string): Promise<Response> {
  const url = new URL(`${upstreamPath}${request.nextUrl.search}`, API_URL);

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const sandbox = request.cookies.get(SANDBOX_COOKIE)?.value;
  if (sandbox) headers.set('x-sandbox-id', sandbox);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    signal: request.signal,
    cache: 'no-store',
  });

  const responseHeaders = new Headers({ 'cache-control': 'no-store, no-transform' });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
