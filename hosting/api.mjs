import { GET as publicConfig } from '../app/api/public/config/route.ts';
import { GET as availability } from '../app/api/public/availability/route.ts';
import { POST as signup } from '../app/api/public/signup/route.ts';
import { GET as state, PUT as update } from '../app/api/state/route.ts';
import { json } from '../lib/shiftmate-common.ts';

const routes = {
  '/api/state': { GET: state, PUT: update },
  '/api/public/config': { GET: publicConfig },
  '/api/public/availability': { GET: availability },
  '/api/public/signup': { POST: signup },
};

export default async function api(request) {
  const handler = routes[new URL(request.url).pathname]?.[request.method];
  if (!handler) return json({error: 'Unsupported request.'}, 405);
  return handler(request);
}
export const config = { path: '/api/*' };
