import type { NextRequest } from 'next/server';
import { forwardToApi } from '@/lib/api/forward';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function handle(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  try {
    return await forwardToApi(request, `/v1/${path.join('/')}`);
  } catch {
    return Response.json(
      {
        type: 'about:blank',
        title: 'Service unavailable',
        status: 503,
        detail: 'The banking service is unreachable. Please try again in a moment.',
        code: 'api_unavailable',
      },
      { status: 503 },
    );
  }
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
