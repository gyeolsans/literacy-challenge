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

## 4. 오류 확인

브라우저 개발자도구에서 다음을 확인하세요.

- Console: Supabase 연결 테스트 결과와 단계별 오류
- Network: Supabase REST/WebSocket 요청 상태

대표 오류:

- `Failed to fetch`: URL/anon key, 인터넷 연결, Supabase 프로젝트 상태, CORS 확인
- `42P01`: 테이블 없음. `supabase-schema.sql` 실행 필요
- `42501`: RLS 정책 차단. 개발용 RLS 정책 확인
- `Invalid API key`: anon key 오입력
- `JWT`: key 또는 인증 토큰 문제

## 5. 로컬 실행

온라인 기능은 `file://` 직접 실행보다 dev server에서 확인하세요.

```bash
npm run dev
```

포트 충돌 시:

```powershell
$env:PORT=3001; npm run dev
```
