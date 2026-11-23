import { GET as publicConfig } from '../app/api/public/config/route.ts';
import { GET as availability } from '../app/api/public/availability/route.ts';
import { POST as signup } from '../app/api/public/signup/route.ts';
import { GET as state, PUT as update } from '../app/api/state/route.ts';
import { json } from '../lib/shiftmate-common.ts';

import { accounts } from './accounts-api.mjs';

const routes = {
  '/api/state': { GET: state, PUT: update },
  '/api/public/config': { GET: publicConfig },
  '/api/public/availability': { GET: availability },
  '/api/public/signup': { POST: signup },
};

export default async function api(request) {
  if (['/api/session','/api/account','/api/company','/api/team','/api/activity','/api/recruiter'].includes(new URL(request.url).pathname)) {
    try { return await accounts(request); } catch { return json({error:'The request could not be completed. Check the details and try again.'},503); }
  }
  const handler = routes[new URL(request.url).pathname]?.[request.method];
  if (!handler) return json({error: 'Unsupported request.'}, 405);
  return handler(request);
}
export const config = { path: '/api/*' };
