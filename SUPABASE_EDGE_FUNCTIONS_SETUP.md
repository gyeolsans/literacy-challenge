# Supabase Edge Functions 설정

OpenAI API Key는 프론트엔드 파일에 넣지 않습니다. `OPENAI_API_KEY`는 Supabase Secret으로만 저장하고, Edge Function 안에서만 읽습니다.

## 1. Supabase CLI 설치

```bash
npm install -g supabase
```

## 2. 로그인 및 프로젝트 연결

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF`는 Supabase 프로젝트 URL의 ref 값입니다.

## 3. OpenAI API Key를 Secret으로 설정

```bash
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

선택 사항으로 모델을 바꿀 수 있습니다.

```bash
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
```

## 4. Edge Function 배포

```bash
supabase functions deploy generate-questions
```

## 5. 로컬 테스트

`.env.local`에 서버 전용 키를 넣습니다. 이 파일은 커밋하지 마세요.

```bash
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-4.1-mini
```

로컬에서 함수만 실행하려면:

```bash
supabase functions serve generate-questions --env-file .env.local
```

## 6. 프론트엔드 호출 확인

앱의 AI 문제 생성은 `supabase.functions.invoke("generate-questions")`를 사용합니다.

확인할 점:

- [config.js](./config.js)에 Supabase URL과 anon public key가 있어야 합니다.
- Supabase service_role key는 프론트엔드에 넣지 않습니다.
- OpenAI API Key는 `config.js`, `index.html`, `script.js`에 넣지 않습니다.
- AI 생성 실패 시 앱은 저장된 AI 문제 또는 샘플 문제로 fallback합니다.
