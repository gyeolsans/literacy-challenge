# Supabase Setup

## 1. Project URL 넣기

Supabase 프로젝트에서 `Project Settings > API`로 이동한 뒤 `Project URL`을 복사합니다.

[config.js](./config.js)에 입력합니다.

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_PUBLIC_KEY"
};
```

## 2. anon public key 넣기

같은 화면에서 `anon public` key를 복사해 `SUPABASE_ANON_KEY`에 넣습니다.

절대 `service_role` key를 넣지 마세요. service role key는 서버 전용이며 프론트엔드에 노출되면 안 됩니다.

## 3. SQL 실행

Supabase Dashboard의 `SQL Editor`에서 [supabase-schema.sql](./supabase-schema.sql) 내용을 실행합니다.

실행 후 `Table Editor`에서 다음 테이블이 있는지 확인하세요.

- users
- rooms
- room_players
- room_matches
- ranking_profiles
- ranked_matches
- replays
- replay_items
- public_replay_likes
- questions_cache

## 4. 테스트 게스트 모드

현재 앱은 Google 로그인 없이 브라우저 로컬 테스트 게스트 ID를 사용합니다.

- 게스트 ID 예: `guest_xxx`
- 사용자/방/랭킹전 관련 `user_id` 컬럼은 `text` 타입이어야 합니다.
- 기존 테이블에 UUID 타입 사용자 컬럼이 남아 있으면 `alter table add column`만으로는 타입 충돌을 해결할 수 없습니다.

새 테스트 DB라면 [supabase-schema.sql](./supabase-schema.sql)을 실행하세요.

이미 UUID 기반 prototype 데이터가 섞인 개발 DB라면 데이터 보존이 필요 없는 경우 [supabase-test-guest-schema.sql](./supabase-test-guest-schema.sql)로 초기화하는 편이 가장 단순합니다.

## 5. Realtime 설정 확인

대결 방과 랭킹전 화면 자동 이동은 Supabase Realtime에 의존합니다.

Supabase 콘솔에서 `Database > Replication` 또는 `Realtime` 설정을 열고 아래 테이블이 Realtime 대상인지 확인하세요.

- `rooms`
- `room_players`
- `ranked_matches`

SQL로 직접 추가해야 하는 경우 Supabase SQL Editor에서 실행하세요.

```sql
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.ranked_matches;
```

이미 등록된 테이블이면 Supabase가 중복 안내를 보여줄 수 있습니다. 그 경우는 무시해도 됩니다.

## 6. 오류 확인

브라우저 개발자도구에서 다음을 확인하세요.

- Console: Supabase 연결 테스트 결과와 단계별 오류
- Network: Supabase REST/WebSocket 요청 상태
- 관리자 화면: Supabase diagnostics, Realtime channel, AI Edge Function 직접 테스트

대표 오류:

- `Failed to fetch`: URL/anon key, 인터넷 연결, Supabase 프로젝트 상태, CORS 확인
- `42P01`: 테이블 없음. `supabase-schema.sql` 실행 필요
- `42501`: RLS 정책 차단. 개발용 RLS 정책 확인
- `Invalid API key`: anon key 오입력
- `JWT`: key 또는 인증 토큰 문제
- `invalid input syntax for type uuid`: 기존 UUID 컬럼에 `guest_xxx` 텍스트 ID를 넣으려는 상태. 테스트 DB 초기화 또는 컬럼 타입 migration 필요

## 7. 로컬 실행

온라인 기능은 `file://` 직접 실행보다 dev server에서 확인하세요.

```bash
npm run dev
```

포트 충돌 시:

```powershell
$env:PORT=3001; npm run dev
```

## 8. AI 문제 생성

AI 문제 생성은 Supabase Edge Function `generate-questions`를 통해 실행합니다.

```bash
supabase.cmd secrets set OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
supabase.cmd functions deploy generate-questions
```

AI 생성이 실패해도 앱은 저장된 문제 또는 샘플 문제로 대체 진행합니다. 배포 후 관리자 화면의 `AI Edge Function 직접 테스트` 버튼으로 `provider`, `model`, 성공/실패 원인을 확인하세요.

## 9. 배포/캐시 확인

```bash
git add .
git commit -m "stable realtime test mode"
git push
# 또는
npx vercel --prod
```

브라우저 콘솔에서 `DEPLOY_VERSION stable-realtime-test-mode-v1`이 보여야 최신 코드입니다.

## 10. 기존 데이터 정리 안내

이번 구조는 로그인 없이 테스트 게스트 ID 기준입니다. 기존 개발 데이터가 anonymous localStorage UUID, nickname 기반 row, UUID 기반 user_id와 섞여 있으면 랭킹 중복이나 방 참가 오류처럼 보일 수 있습니다.

개발 단계에서 데이터 보존이 중요하지 않다면 Supabase SQL Editor에서 `supabase-test-guest-schema.sql`을 실행해 prototype 테이블을 재생성하는 방식이 가장 단순합니다.

보존이 필요하면 다음 원칙으로 migration하세요.

- `users.user_id`, `room_players.user_id`, `ranking_profiles.user_id`, `ranked_matches.player1_user_id`, `ranked_matches.player2_user_id`는 `text` 기준으로 맞춥니다.
- `ranking_profiles.user_id`는 테스트 게스트 ID만 남깁니다.
- `ranked_games = 0`인 중복 ranking profile은 삭제하거나 숨깁니다.
- nickname만 같은 row를 합치지 말고 `user_id` 기준으로만 합칩니다.
