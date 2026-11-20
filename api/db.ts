// 계정, 글, 투표, 반 설정 저장 (Supabase). 설정이 없으면 {on:false} → 화면은 브라우저 메모리만 씀
import { handler } from '../server/http';
import { db } from '../server/store';
export default handler((b) => db(b));
