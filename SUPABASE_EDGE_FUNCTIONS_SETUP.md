# Supabase Edge Functions 설정

이 앱의 AI 문제 생성은 Vercel `/api/generate-questions`가 아니라 Supabase Edge Function `generate-questions`만 사용합니다. OpenAI API Key는 프론트엔드 파일에 넣지 말고 Supabase Secret으로만 저장하세요.

## 1. Supabase 스키마 적용

Supabase Dashboard의 SQL Editor에서 [supabase-schema.sql](./supabase-schema.sql)을 실행합니다.

이 스키마는 반복 실행 가능하도록 `create table if not exists`, `alter table add column if not exists`, `drop policy if exists`를 사용합니다.

## 2. Supabase CLI 설치 및 연결

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF`는 Supabase 프로젝트 URL의 ref 값입니다.

## 3. OpenAI Key를 Supabase Secret으로 설정

```bash
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_MODEL`은 선택 사항입니다. 설정하지 않으면 Edge Function 기본값을 사용합니다.

## 4. Edge Function 배포

```bash
supabase functions deploy generate-questions
```

로컬에서 함수만 테스트하려면 `.env.local`에 서버 전용 키를 넣고 실행합니다. 이 파일은 커밋하지 마세요.

```bash
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-4.1-mini
```

```bash
supabase functions serve generate-questions --env-file .env.local
```

## 5. Vercel 배포 및 캐시 확인

현재 배포 버전 표식은 `repair-v2-ai-room-ranked`입니다.

```bash
git status
git add .
git commit -m "Restore Supabase online features"
git push
```

배포 후 브라우저 콘솔에서 다음 로그를 확인합니다.

```text
DEPLOY_VERSION repair-v2-ai-room-ranked
APP_CONFIG_AT_START ...
```

[index.html](./index.html)은 로컬 스크립트에 `?v=repair-v2-ai-room-ranked` 쿼리를 붙여 Vercel/브라우저 캐시가 오래된 `script.js`를 잡는 일을 줄입니다.

## 6. 앱에서 진단하기

관리자 화면에 들어가서 Supabase diagnostics 버튼을 순서대로 확인합니다.

- Supabase connection: 주요 테이블 select/RLS 확인
- Realtime channel: Supabase Realtime 채널 구독 확인
- AI Edge Function: `generate-questions` 함수 호출 확인
- Refresh rooms: 공개 대기 방 조회 확인
- Cleanup stale rooms: 오래된 대기 방 취소 처리 확인
- localStorage state: 현재 방/사용자 로컬 상태 확인
- User/ranked profile: 원격 사용자와 랭킹 프로필 확인

## 7. 주의

- 프론트엔드에는 Supabase anon public key만 둡니다.
- `OPENAI_API_KEY`와 Supabase service role key는 `config.js`, `index.html`, `script.js`에 넣지 않습니다.
- AI 문제 생성 실패 시 앱은 저장된 AI 문제와 샘플 문제로 fallback합니다.
