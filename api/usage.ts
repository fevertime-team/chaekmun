// AI 사용량 요약 (GET). 금액과 호출 수만 돌려주고 키나 글 내용은 돌려주지 않습니다. 화면: /usage.html
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { usageSummary } from '../server/store';

export default async function (_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.status(200).json(await usageSummary());
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e).slice(0, 200) });
  }
}
