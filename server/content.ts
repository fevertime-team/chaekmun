// 기사, 페르소나, 루브릭 데이터. 원본은 index.html 이고 scripts/extract-data.mjs 가 content.json 을 만듭니다.
import content from './content.json';
import { sentences } from './text';

export type Level = 'choshi' | 'boksi' | 'jeonsi';
type Bank = { p: string; t: string; q: string; src?: number };
export type Stance = { id: string; label: string; kw: string[]; premise: string; premiseQ: string; bank: Bank[] };
export type Cluster = { i: number; label: string; stance: string; tam: boolean; text: string };
export type Article = {
  id: string; field: string; title: string; source: string; url: string;
  summary: string[]; body: string[] | null; personas: string[];
  q: Record<Level, string>; stances: Stance[];
  choshiPremise: string; choshiQ: string; choshiBank: Bank[];
  samples: Record<string, string>; revised: Record<string, string>; clusters: Cluster[];
};
export type Persona = { name: string; mark: string; desc: string; focus?: string; asks?: string[]; tone?: string; expert?: boolean };

const C = content as unknown as {
  personas: Record<string, Persona>;
  levels: Record<Level, { name: string; target: number; weak: number }>;
  rubric: Record<string, { en: string; def: string }>;
  articles: Article[];
};
export const PERSONAS = C.personas;
export const LEVELS = C.levels;
export const RUBRIC = C.rubric;
export const ARTICLES = C.articles;

export function getArticle(id: string): Article {
  const a = ARTICLES.find((x) => x.id === id);
  if (!a) throw new HttpError(400, `알 수 없는 기사입니다: ${id}`);
  return a;
}
export function getLevel(l: string): Level {
  if (l === 'choshi' || l === 'boksi' || l === 'jeonsi') return l;
  throw new HttpError(400, `알 수 없는 난이도입니다: ${l}`);
}

/** 반론의 사실 근거 범위: 원문 전문이 있으면 원문 문장, 없으면 세 줄 요약.
 *  화면은 source.line 을 '요약 몇 번째 줄'로 보여 주므로 kind 도 함께 돌려줍니다. */
export function evidenceLines(a: Article): { kind: 'body' | 'summary'; lines: string[] } {
  if (a.body && a.body.length) return { kind: 'body', lines: a.body.flatMap((p) => sentences(p)) };
  return { kind: 'summary', lines: a.summary };
}

export class HttpError extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}
