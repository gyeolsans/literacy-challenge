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

## 6. Realtime 설정 확인

대결 방과 랭킹전 화면 자동 이동은 Supabase Realtime에 의존합니다.

Supabase 콘솔에서 `Database > Replication` 또는 `Realtime` 설정을 열고 아래 테이블이 Realtime 대상인지 확인하세요.

- `rooms`
- `room_players`
- `ranked_matches`

SQL로 직접 추가해야 하는 경우 `supabase-schema.sql` 맨 아래의 `supabase_realtime` publication 등록 블록을 실행하세요. 이미 등록된 테이블은 중복 오류를 무시하도록 작성되어 있습니다.

## 7. Supabase Auth 로그인 설정

Google 로그인:

1. Supabase Dashboard > Authentication > Providers로 이동합니다.
2. Google provider를 활성화합니다.
3. Google Cloud Console에서 OAuth Client ID와 Client Secret을 생성합니다.
4. Supabase가 보여주는 Redirect URL을 Google OAuth 승인된 리디렉션 URI에 등록합니다.
5. Supabase Authentication > URL Configuration에서 Site URL과 Redirect URLs에 로컬/배포 주소를 등록합니다.
   - 로컬 예: `http://localhost:3000`
   - 배포 예: Vercel production URL

네이버 로그인:

- 현재 앱에서는 준비 중 버튼만 표시합니다.
- Supabase 기본 OAuth provider에 네이버가 없으면 Custom OAuth/OIDC 구성이 필요합니다.

AI 문제 생성:

```bash
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY
supabase functions deploy generate-questions
```

배포 후 관리자 화면의 `AI 문제 생성 테스트` 버튼으로 성공/실패 원인을 확인하세요.

배포/캐시 확인:

```bash
git add .
git commit -m "auth bot ai fix"
git push
# 또는
npx vercel --prod
```

브라우저 콘솔에서 `DEPLOY_VERSION auth-bot-ai-fix-v1`이 보여야 최신 코드입니다.

## 8. 기존 익명/텍스트 ID 데이터 정리 안내

이번 구조는 Supabase Auth `user.id` 기준입니다. 기존 개발 데이터가 anonymous localStorage UUID, nickname 기반 row, text 기반 user_id와 섞여 있으면 랭킹 중복처럼 보일 수 있습니다.

개발 단계에서 데이터 보존이 중요하지 않다면 Supabase SQL Editor에서 기존 prototype 테이블을 비운 뒤 `supabase-schema.sql`을 다시 실행하는 방식이 가장 단순합니다.

보존이 필요하면 다음 원칙으로 migration하세요.

- `users.id` 또는 `users.user_id`는 Auth user id와 맞춥니다.
- `ranking_profiles.user_id`는 Auth user id만 남깁니다.
- `ranked_games = 0`인 중복 ranking profile은 삭제하거나 숨깁니다.
- nickname만 같은 row를 합치지 말고 `user_id` 기준으로만 합칩니다.
