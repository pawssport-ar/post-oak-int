/** Liveness probe for the platform. It deliberately does not depend on the API. */
export function GET(): Response {
  return Response.json({ status: 'ok' });
}
