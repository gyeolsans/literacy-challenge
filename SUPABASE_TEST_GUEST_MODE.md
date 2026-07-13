# Test Guest Mode

현재 버전은 Google OAuth 없이 테스트용 게스트 계정으로 동작합니다.

- 브라우저 localStorage에 `guestUserId`가 저장됩니다.
- 값은 `guest_` + UUID 형식입니다.
- 닉네임은 `guestNickname` 및 기존 `literacy.nickname`에 함께 저장됩니다.
- 같은 브라우저에서는 같은 게스트 유저로 인식됩니다.
- 다른 브라우저나 localStorage 삭제 후에는 다른 게스트 유저로 인식됩니다.

## Supabase Schema

기존 Supabase 스키마가 UUID 기반이면 `guest_...` 문자열을 넣을 수 없습니다. 개발 테스트 데이터가 중요하지 않을 때만 아래 파일을 Supabase SQL Editor에서 실행하세요.

```text
supabase-test-guest-schema.sql
```

이 파일은 다음 테이블을 drop 후 text 기반 test guest schema로 다시 만듭니다.

- `users`
- `rooms`
- `room_players`
- `room_matches`
- `ranking_profiles`
- `ranked_matches`
- `replays`
- `replay_items`
- `questions_cache`

## Nickname Rules

- 2~12자
- 한글, 영문, 숫자, 언더바만 허용
- 공백 금지
- `nickname_normalized` unique index로 대소문자 구분 없이 중복 방지

## Google Auth

Google OAuth 코드는 현재 화면에서 호출하지 않습니다. 나중에 실제 계정 로그인을 다시 붙일 때는 `services/userRemoteService.js`의 guest facade를 auth service와 분리하거나 교체하면 됩니다.
