import type { NextRequest } from 'next/server';
import { forwardToApi } from '@/lib/api/forward';

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

/** Serves the API's Swagger UI from this origin, so one public domain covers everything. */
export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path = [] } = await context.params;
  return forwardToApi(request, `/docs${path.length > 0 ? `/${path.join('/')}` : ''}`);
}
