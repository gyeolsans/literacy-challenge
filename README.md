# 문해력 챌린지 실행 안내

## 로컬 실행

```bash
npm run dev
```

기본 주소:

```text
http://localhost:3000
```

3000번 포트가 이미 사용 중이면 `PORT` 환경 변수를 지정하세요.

PowerShell:

```powershell
$env:PORT=3001; npm run dev
```

macOS/Linux:

```bash
PORT=3001 npm run dev
```

## file:// 직접 실행

`index.html`을 더블클릭해서 `file://`로 열면 온라인 기능과 API 기능이 제한됩니다.

온라인 대결, 랭킹전, Supabase 연결, AI 문제 생성 기능을 확인하려면 반드시 `npm run dev` 또는 Vercel 배포 주소로 접속하세요.

## Supabase 설정

[config.example.js](./config.example.js)를 참고해 [config.js](./config.js)에 `SUPABASE_URL`, `SUPABASE_ANON_KEY`를 입력하세요.

`service_role` key는 절대 프론트엔드에 넣지 마세요.

자세한 설정은 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)를 참고하세요.
