// 상태 확인: 키 값은 절대 돌려주지 않고, 설정 여부와 모델 이름만
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hasLLM, MODEL, MODEL_FAST, PROVIDER } from '../server/llm';
export default function (_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ llm: hasLLM(), provider: PROVIDER(), model: MODEL(), modelFast: MODEL_FAST(), baseUrlSet: Boolean(process.env.LLM_BASE_URL) });
}
