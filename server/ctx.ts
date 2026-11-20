// 요청 하나의 맥락 (어느 API 경로에서 AI를 불렀는지). 사용량 기록에 씁니다.
import { AsyncLocalStorage } from 'node:async_hooks';

export const reqCtx = new AsyncLocalStorage<{ route: string }>();
export const currentRoute = () => reqCtx.getStore()?.route ?? null;
