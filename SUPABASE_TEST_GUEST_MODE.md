# Test Guest Mode

현재 버전은 Google OAuth 없이 테스트용 게스트 계정으로 동작합니다.

- 브라우저 localStorage에 `guestUserId`가 저장됩니다.
- `guestUserId` 값은 접두사 없는 순수 UUID입니다.
- user_id 컬럼에는 항상 순수 UUID만 저장합니다.
- 게스트 여부는 `is_guest=true`로 구분합니다.
- 화면 닉네임은 `Guest123456` 형태를 계속 사용할 수 있습니다.

## Supabase Schema

UUID 타입 컬럼을 text로 바꾸지 마세요. `supabase-schema.sql`은 테스트 게스트도 UUID user_id를 사용하도록 맞춰져 있습니다.

필수 게스트 컬럼:

```sql
alter table users add column if not exists is_guest boolean default true;
alter table users add column if not exists provider text default 'test_guest';
alter table users add column if not exists nickname_normalized text;
alter table ranking_profiles add column if not exists is_guest boolean default true;
```

개발 데이터 전체 초기화가 필요할 때만 `supabase-test-guest-schema.sql`을 실행하세요. 이 reset schema도 user_id는 UUID 기준입니다.

## Nickname Rules

- 2~12자
- 한글, 영문, 숫자, 언더바만 허용
- 공백 금지
- `nickname_normalized` unique index로 대소문자 구분 없이 중복 방지

## Google Auth

Google OAuth 코드는 현재 화면에서 호출하지 않습니다. 나중에 실제 계정 로그인을 붙일 때는 `services/userRemoteService.js`의 guest facade를 auth service와 분리하거나 교체하면 됩니다.
