# Supabase Setup

## 1. Config

Supabase Dashboard의 `Project Settings > API`에서 Project URL과 anon public key를 복사해 [config.js](./config.js)에 넣습니다.

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_PUBLIC_KEY"
};
```

프론트엔드에는 절대 `service_role` key를 넣지 마세요.

## 2. SQL

Supabase SQL Editor에서 [supabase-schema.sql](./supabase-schema.sql)을 실행합니다.

테스트 게스트 모드는 user_id에 접두사를 붙이지 않습니다.

- `user_id`: 순수 UUID
- `nickname`: 예: `Guest123456`
- `is_guest`: `true`
- `provider`: `test_guest`

UUID 타입 컬럼을 text로 바꾸지 마세요. 게스트 여부는 `is_guest` 컬럼으로 구분합니다.

필수 게스트 컬럼:

```sql
alter table users add column if not exists is_guest boolean default true;
alter table users add column if not exists provider text default 'test_guest';
alter table users add column if not exists nickname_normalized text;
alter table ranking_profiles add column if not exists is_guest boolean default true;
```

## 3. Realtime

방 만들기와 랭킹전 자동 갱신에는 Realtime이 필요합니다.

```sql
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.ranked_matches;
```

이미 등록된 테이블이라는 안내가 나오면 무시해도 됩니다.

## 4. Local Run

온라인 기능은 `file://` 직접 실행보다 dev server에서 확인하세요.

```bash
npm run dev
```

포트 충돌 시:

```powershell
$env:PORT=3001; npm run dev
```

## 5. Common Errors

- `PGRST204`: 컬럼 누락. `supabase-schema.sql` 실행 후 10~30초 기다렸다가 새로고침하세요.
- `22P02 invalid input syntax for type uuid`: UUID 컬럼에 잘못된 user_id가 들어간 상태입니다. localStorage의 이전 잘못된 게스트 ID는 앱 시작 시 자동으로 순수 UUID로 정리됩니다.
- `42P01`: 테이블 없음. schema SQL을 실행하세요.
- `42501`: RLS 정책 차단. 개발용 RLS 정책을 확인하세요.

## 6. AI Edge Function

```bash
supabase.cmd secrets set OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
supabase.cmd functions deploy generate-questions
```

AI 생성 실패 시 앱은 내장 AI fallback 문제로 계속 진행합니다.
