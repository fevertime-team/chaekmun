// api/*.ts 공통: POST JSON 만 받고, 오류는 JSON 으로 돌려줍니다.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HttpError } from './content';
import { reqCtx } from './ctx';

export function handler(fn: (body: any) => Promise<unknown>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST 만 받습니다' });
    const t0 = Date.now();
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const route = String(req.url || '').split('?')[0].replace(/^\/api\//, '') || null;
      const out = await reqCtx.run({ route: route || '' }, () => fn(body));
      res.setHeader('X-Elapsed-Ms', String(Date.now() - t0));
      return res.status(200).json(out);
    } catch (e: any) {
      const status = e instanceof HttpError ? e.status : 500;
      console.error('[api]', req.url, String(e?.stack || e).slice(0, 500));
      return res.status(status).json({ error: String(e?.message || e).slice(0, 300) });
    }
  };
}
