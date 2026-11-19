// 고쳐 쓰기 칸 입력 검사: 답안 대신 AI에게 하는 요청을 적었는지
import { handler } from '../server/http';
import { revisedLooksLikeRequest } from '../server/services';
export default handler(async (b) => ({ blocked: revisedLooksLikeRequest(b.text) }));
