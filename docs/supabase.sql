-- 오늘의 책문 저장소 (Supabase SQL Editor에서 한 번 실행)
-- 서버 함수(/api/db)가 서버 전용 키로만 읽고 씁니다. RLS 를 켜고 정책을 두지 않아 브라우저(anon 키)로는 접근할 수 없습니다.
-- 시연 계정(demo, student, professor, center)과 예시 답안은 화면 코드 안에 있고, 여기에는 실제 가입자의 데이터만 쌓입니다.

create table if not exists public.app_users (
  id         text primary key,
  scope      text not null check (scope in ('p', 'o')),   -- p 개인, o 기관
  username   text not null,
  pw_hash    text not null,                                -- scrypt(소금:해시)
  nickname   text not null,
  role       text not null check (role in ('personal', 'student', 'professor', 'center')),
  class_id   text,
  org_id     text,
  created_at timestamptz not null default now(),
  unique (scope, username)
);

create table if not exists public.essays (
  id         text primary key,
  user_id    text not null references public.app_users(id) on delete cascade,
  nickname   text,
  article_id text not null,
  level      text not null,
  class_id   text,
  published  boolean not null default true,
  data       jsonb not null,                               -- 화면의 글 객체 전체 (처음 글, 고친 글, 점수, 과정 기록)
  created_at timestamptz not null default now()
);
create index if not exists essays_article_level on public.essays (article_id, level);
create index if not exists essays_class on public.essays (class_id);

-- 예시 답안(ex-...)에도 투표할 수 있어 essays 를 참조하지 않습니다
create table if not exists public.votes (
  user_id    text not null references public.app_users(id) on delete cascade,
  essay_id   text not null,
  kind       text not null check (kind in ('ag', 'pn')),  -- 화면의 투표 종류 두 가지
  created_at timestamptz not null default now(),
  primary key (user_id, essay_id, kind)
);

create table if not exists public.class_settings (
  class_id   text primary key,
  rubric     jsonb,
  focus      text,
  assigned   jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_users      enable row level security;
alter table public.essays         enable row level security;
alter table public.votes          enable row level security;
alter table public.class_settings enable row level security;

-- 새 Supabase 프로젝트는 SQL로 만든 테이블에 API 권한을 자동으로 주지 않음 → 서버 키(service_role)에만 부여
grant usage on schema public to service_role;
grant select, insert, update, delete on public.app_users, public.essays, public.votes, public.class_settings to service_role;

-- AI 호출 사용량 기록 (서버 함수가 호출마다 한 줄씩 넣음, 화면: /usage.html, API: /api/usage)
create table if not exists public.llm_usage (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  model text not null,
  route text,
  env text,
  in_tok integer not null default 0,
  out_tok integer not null default 0,
  cache_read_tok integer not null default 0,
  cost_usd numeric(12,6) not null default 0
);
create index if not exists llm_usage_at on public.llm_usage (at);
alter table public.llm_usage enable row level security;

-- 모델별 합계 (오늘 = 한국 시간 0시부터)
create or replace view public.llm_usage_by_model with (security_invoker = true) as
select model,
  count(*)::int as calls,
  coalesce(sum(in_tok),0)::bigint as in_tok,
  coalesce(sum(out_tok),0)::bigint as out_tok,
  coalesce(sum(cost_usd),0)::float8 as usd,
  count(*) filter (where at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'))::int as today_calls,
  coalesce(sum(cost_usd) filter (where at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')),0)::float8 as today_usd,
  max(at) as last_at
from public.llm_usage group by model;

grant select, insert on public.llm_usage to service_role;
grant select on public.llm_usage_by_model to service_role;
grant usage on all sequences in schema public to service_role;

-- (11/20 오후) 센터 담당자 역할 추가: 이미 만든 테이블에는 아래 두 줄을 한 번 실행
alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users add constraint app_users_role_check check (role in ('personal', 'student', 'professor', 'center'));
