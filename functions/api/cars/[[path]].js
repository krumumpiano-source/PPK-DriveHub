// Alias /api/cars -> /api/vehicles for backwards compatibility
import { onRequest as vehiclesOnRequest } from '../vehicles/[[path]].js';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/^\/api\/cars/, '/api/vehicles');
  const rewrittenRequest = new Request(url.toString(), request);
  return vehiclesOnRequest({ ...context, request: rewrittenRequest });
}
