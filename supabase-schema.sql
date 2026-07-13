create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  user_id text unique,
  nickname text not null,
  email text null,
  avatar_url text null,
  provider text null,
  auth_user_id uuid null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  host_user_id text,
  host_nickname text,
  title text,
  max_players integer default 4,
  status text check (status in ('waiting', 'playing', 'finished', 'cancelled')) default 'waiting',
  difficulty text,
  question_count integer,
  include_short_answer boolean,
  has_time_limit boolean default false,
  time_limit_enabled boolean,
  time_per_question integer,
  selected_types jsonb,
  question_set jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  started_at timestamp with time zone null,
  finished_at timestamp with time zone null,
  cancelled_at timestamp with time zone null
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  user_id text,
  nickname text,
  is_host boolean default false,
  is_ready boolean default false,
  current_index integer default 0,
  current_score numeric default 0,
  correct_count integer default 0,
  partial_count integer default 0,
  wrong_count integer default 0,
  total_time numeric default 0,
  status text check (status in ('joined', 'ready', 'playing', 'finished', 'left')) default 'joined',
  joined_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  finished_at timestamp with time zone null,
  unique(room_id, user_id)
);

create table if not exists public.room_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  winner_user_id text null,
  result_summary jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.ranking_profiles (
  user_id text primary key,
  nickname text not null,
  rating integer default 1000,
  tier text default '랭킹없음',
  tier_icon text default '',
  division integer default 5,
  ranked_games integer default 0,
  percentile numeric null,
  rank_position integer null,
  total_ranked_players integer default 0,
  wins integer default 0,
  losses integer default 0,
  draws integer default 0,
  win_streak integer default 0,
  lose_streak integer default 0,
  promotion_series_active boolean default false,
  promotion_wins integer default 0,
  promotion_losses integer default 0,
  updated_at timestamp with time zone default now()
);

create table if not exists public.ranked_matches (
  id uuid primary key default gen_random_uuid(),
  player_a_id text,
  player_b_id text,
  player1_user_id text,
  player2_user_id text,
  player1_nickname text,
  player2_nickname text,
  winner_user_id text null,
  status text check (status in ('matching', 'playing', 'finished', 'cancelled')) default 'matching',
  difficulty text,
  question_count integer,
  question_set jsonb,
  player_a_result jsonb,
  player_b_result jsonb,
  player1_result jsonb,
  player2_result jsonb,
  is_bot_match boolean default false,
  bot_user_id text,
  bot_nickname text,
  bot_profile jsonb,
  bot_result jsonb,
  rating_delta_a integer default 0,
  rating_delta_b integer default 0,
  rating_delta_player1 integer default 0,
  rating_delta_player2 integer default 0,
  promotion_result_a jsonb,
  promotion_result_b jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  started_at timestamp with time zone null,
  finished_at timestamp with time zone null,
  cancelled_at timestamp with time zone null
);

create table if not exists public.replays (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  nickname text,
  mode text check (mode in ('solo', 'room', 'ranked', 'today')) default 'solo',
  related_match_id uuid null,
  title text,
  difficulty text,
  score numeric,
  max_score numeric,
  grade text,
  correct_count integer,
  partial_count integer,
  wrong_count integer,
  total_questions integer,
  total_time integer,
  average_time numeric,
  is_public boolean default false,
  public_title text null,
  view_count integer default 0,
  like_count integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.replay_items (
  id uuid primary key default gen_random_uuid(),
  replay_id uuid references public.replays(id) on delete cascade,
  question_index integer,
  question_snapshot jsonb,
  user_answer jsonb,
  grading_result jsonb,
  elapsed_time integer,
  is_correct boolean,
  is_partial boolean,
  is_timeout boolean,
  explanation_snapshot text,
  analysis_snapshot jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.public_replay_likes (
  id uuid primary key default gen_random_uuid(),
  replay_id uuid references public.replays(id) on delete cascade,
  user_id text,
  created_at timestamp with time zone default now(),
  unique(replay_id, user_id)
);

create table if not exists public.questions_cache (
  id uuid primary key default gen_random_uuid(),
  difficulty text,
  selected_types jsonb,
  include_short_answer boolean,
  question_count integer,
  questions jsonb,
  created_by text null,
  created_at timestamp with time zone default now()
);

alter table public.rooms add column if not exists host_nickname text;
alter table public.rooms add column if not exists title text;
alter table public.rooms add column if not exists max_players integer default 4;
alter table public.rooms add column if not exists updated_at timestamp with time zone default now();
alter table public.rooms add column if not exists cancelled_at timestamp with time zone null;

alter table public.users add column if not exists user_id text unique;
alter table public.users add column if not exists email text null;
alter table public.users add column if not exists avatar_url text null;
alter table public.users add column if not exists provider text null;
alter table public.users add column if not exists auth_user_id uuid null;

alter table public.room_players add column if not exists updated_at timestamp with time zone default now();
alter table public.room_players alter column total_time type numeric using total_time::numeric;

alter table public.ranking_profiles add column if not exists ranked_games integer default 0;
alter table public.ranking_profiles add column if not exists percentile numeric null;
alter table public.ranking_profiles add column if not exists rank_position integer null;
alter table public.ranking_profiles add column if not exists total_ranked_players integer default 0;
alter table public.ranking_profiles add column if not exists tier_icon text default '';

alter table public.ranked_matches add column if not exists player1_user_id text;
alter table public.ranked_matches add column if not exists player2_user_id text;
alter table public.ranked_matches add column if not exists player1_nickname text;
alter table public.ranked_matches add column if not exists player2_nickname text;
alter table public.ranked_matches add column if not exists player1_result jsonb;
alter table public.ranked_matches add column if not exists player2_result jsonb;
alter table public.ranked_matches add column if not exists is_bot_match boolean default false;
alter table public.ranked_matches add column if not exists bot_user_id text;
alter table public.ranked_matches add column if not exists bot_nickname text;
alter table public.ranked_matches add column if not exists bot_profile jsonb;
alter table public.ranked_matches add column if not exists bot_result jsonb;
alter table public.ranked_matches add column if not exists rating_delta_player1 integer default 0;
alter table public.ranked_matches add column if not exists rating_delta_player2 integer default 0;
alter table public.ranked_matches add column if not exists updated_at timestamp with time zone default now();
alter table public.ranked_matches add column if not exists cancelled_at timestamp with time zone null;

create unique index if not exists unique_room_players_room_user
on public.room_players(room_id, user_id);

create index if not exists idx_rooms_status_created_at
on public.rooms(status, created_at desc);

create index if not exists idx_room_players_room_id
on public.room_players(room_id);

create index if not exists idx_room_players_user_id
on public.room_players(user_id);

-- Test guest mode note:
-- If this project still uses uuid user columns, guest IDs like guest_xxx cannot be inserted.
-- For development-only reset to text guest IDs, run supabase-test-guest-schema.sql manually.

create index if not exists idx_ranked_matches_status_created_at
on public.ranked_matches(status, created_at desc);

create index if not exists idx_ranked_matches_player_a
on public.ranked_matches(player_a_id);

create index if not exists idx_ranked_matches_player_b
on public.ranked_matches(player_b_id);

create index if not exists idx_ranking_profiles_rating
on public.ranking_profiles(rating desc);

alter table public.users enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_matches enable row level security;
alter table public.ranking_profiles enable row level security;
alter table public.ranked_matches enable row level security;
alter table public.replays enable row level security;
alter table public.replay_items enable row level security;
alter table public.public_replay_likes enable row level security;
alter table public.questions_cache enable row level security;

drop policy if exists "users readable for anon development" on public.users;
drop policy if exists "users insert own anonymous id" on public.users;
drop policy if exists "users update own row development" on public.users;
drop policy if exists "users delete development" on public.users;
drop policy if exists "authenticated users insert own profile development" on public.users;
drop policy if exists "authenticated users update own profile development" on public.users;
drop policy if exists "authenticated users delete own profile development" on public.users;
create policy "users readable for anon development" on public.users for select using (true);
create policy "users insert own anonymous id" on public.users for insert with check (true);
create policy "users update own row development" on public.users for update using (true) with check (true);
create policy "users delete development" on public.users for delete using (true);

drop policy if exists "ranking profiles public read" on public.ranking_profiles;
drop policy if exists "ranking profile insert development" on public.ranking_profiles;
drop policy if exists "ranking profile update owner development" on public.ranking_profiles;
drop policy if exists "ranking profile delete development" on public.ranking_profiles;
drop policy if exists "ranking profile insert authenticated development" on public.ranking_profiles;
drop policy if exists "ranking profile update authenticated development" on public.ranking_profiles;
drop policy if exists "ranking profile delete authenticated development" on public.ranking_profiles;
create policy "ranking profiles public read" on public.ranking_profiles for select using (true);
create policy "ranking profile insert development" on public.ranking_profiles for insert with check (true);
create policy "ranking profile update owner development" on public.ranking_profiles for update using (true) with check (true);
create policy "ranking profile delete development" on public.ranking_profiles for delete using (true);

drop policy if exists "room participant read rooms development" on public.rooms;
drop policy if exists "room create development" on public.rooms;
drop policy if exists "room update participants development" on public.rooms;
drop policy if exists "room delete development" on public.rooms;
drop policy if exists "rooms insert authenticated development" on public.rooms;
drop policy if exists "rooms update authenticated development" on public.rooms;
drop policy if exists "rooms delete authenticated development" on public.rooms;
create policy "room participant read rooms development" on public.rooms for select using (true);
create policy "room create development" on public.rooms for insert with check (true);
create policy "room update participants development" on public.rooms for update using (true) with check (true);
create policy "room delete development" on public.rooms for delete using (true);

drop policy if exists "room players read development" on public.room_players;
drop policy if exists "room players insert development" on public.room_players;
drop policy if exists "room players update own development" on public.room_players;
drop policy if exists "room players delete development" on public.room_players;
drop policy if exists "room players insert authenticated development" on public.room_players;
drop policy if exists "room players update authenticated development" on public.room_players;
drop policy if exists "room players delete authenticated development" on public.room_players;
create policy "room players read development" on public.room_players for select using (true);
create policy "room players insert development" on public.room_players for insert with check (true);
create policy "room players update own development" on public.room_players for update using (true) with check (true);
create policy "room players delete development" on public.room_players for delete using (true);

drop policy if exists "room matches read participants development" on public.room_matches;
drop policy if exists "room matches insert development" on public.room_matches;
drop policy if exists "room matches update development" on public.room_matches;
drop policy if exists "room matches delete development" on public.room_matches;
create policy "room matches read participants development" on public.room_matches for select using (true);
create policy "room matches insert development" on public.room_matches for insert with check (true);
create policy "room matches update development" on public.room_matches for update using (true) with check (true);
create policy "room matches delete development" on public.room_matches for delete using (true);

drop policy if exists "ranked matches read participants development" on public.ranked_matches;
drop policy if exists "ranked matches insert development" on public.ranked_matches;
drop policy if exists "ranked matches update participants development" on public.ranked_matches;
drop policy if exists "ranked matches delete development" on public.ranked_matches;
drop policy if exists "ranked matches insert authenticated development" on public.ranked_matches;
drop policy if exists "ranked matches update authenticated development" on public.ranked_matches;
drop policy if exists "ranked matches delete authenticated development" on public.ranked_matches;
create policy "ranked matches read participants development" on public.ranked_matches for select using (true);
create policy "ranked matches insert development" on public.ranked_matches for insert with check (true);
create policy "ranked matches update participants development" on public.ranked_matches for update using (true) with check (true);
create policy "ranked matches delete development" on public.ranked_matches for delete using (true);

drop policy if exists "public replays readable" on public.replays;
drop policy if exists "own replays readable development" on public.replays;
drop policy if exists "replay insert development" on public.replays;
drop policy if exists "replay owner update development" on public.replays;
drop policy if exists "replay update development" on public.replays;
drop policy if exists "replay delete development" on public.replays;
create policy "public replays readable" on public.replays for select using (is_public = true);
create policy "own replays readable development" on public.replays for select using (true);
create policy "replay insert development" on public.replays for insert with check (true);
create policy "replay update development" on public.replays for update using (true) with check (true);
create policy "replay delete development" on public.replays for delete using (true);

drop policy if exists "public replay items readable through replay" on public.replay_items;
drop policy if exists "own replay items readable development" on public.replay_items;
drop policy if exists "replay items insert development" on public.replay_items;
drop policy if exists "replay items update development" on public.replay_items;
drop policy if exists "replay items delete development" on public.replay_items;
create policy "public replay items readable through replay" on public.replay_items
for select using (exists (select 1 from public.replays r where r.id = replay_id and r.is_public = true));
create policy "own replay items readable development" on public.replay_items for select using (true);
create policy "replay items insert development" on public.replay_items for insert with check (true);
create policy "replay items update development" on public.replay_items for update using (true) with check (true);
create policy "replay items delete development" on public.replay_items for delete using (true);

drop policy if exists "likes read public" on public.public_replay_likes;
drop policy if exists "likes insert user" on public.public_replay_likes;
drop policy if exists "likes update development" on public.public_replay_likes;
drop policy if exists "likes delete user" on public.public_replay_likes;
create policy "likes read public" on public.public_replay_likes for select using (true);
create policy "likes insert user" on public.public_replay_likes for insert with check (true);
create policy "likes update development" on public.public_replay_likes for update using (true) with check (true);
create policy "likes delete user" on public.public_replay_likes for delete using (true);

drop policy if exists "question cache read development" on public.questions_cache;
drop policy if exists "question cache insert development" on public.questions_cache;
drop policy if exists "question cache update development" on public.questions_cache;
drop policy if exists "question cache delete development" on public.questions_cache;
create policy "question cache read development" on public.questions_cache for select using (true);
create policy "question cache insert development" on public.questions_cache for insert with check (true);
create policy "question cache update development" on public.questions_cache for update using (true) with check (true);
create policy "question cache delete development" on public.questions_cache for delete using (true);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_rooms_updated_at on public.rooms;
create trigger set_rooms_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

drop trigger if exists set_room_players_updated_at on public.room_players;
create trigger set_room_players_updated_at
before update on public.room_players
for each row execute function public.set_updated_at();

drop trigger if exists set_ranking_profiles_updated_at on public.ranking_profiles;
create trigger set_ranking_profiles_updated_at
before update on public.ranking_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_ranked_matches_updated_at on public.ranked_matches;
create trigger set_ranked_matches_updated_at
before update on public.ranked_matches
for each row execute function public.set_updated_at();

-- Development policies above intentionally allow anon read/write for the prototype.
-- Replace them with auth.uid() ownership checks before production launch.

-- Stable test guest mode policy override.
-- This prototype runs without Google/Auth. Guest users are browser-local text IDs,
-- so anon read/write is intentionally allowed for the test environment.
drop policy if exists "users insert own anonymous id" on public.users;
drop policy if exists "users update own row development" on public.users;
drop policy if exists "users delete development" on public.users;
drop policy if exists "authenticated users insert own profile development" on public.users;
drop policy if exists "authenticated users update own profile development" on public.users;
drop policy if exists "authenticated users delete own profile development" on public.users;
create policy "users insert own anonymous id" on public.users for insert with check (true);
create policy "users update own row development" on public.users for update using (true) with check (true);
create policy "users delete development" on public.users for delete using (true);

drop policy if exists "ranking profile insert development" on public.ranking_profiles;
drop policy if exists "ranking profile update owner development" on public.ranking_profiles;
drop policy if exists "ranking profile delete development" on public.ranking_profiles;
drop policy if exists "ranking profile insert authenticated development" on public.ranking_profiles;
drop policy if exists "ranking profile update authenticated development" on public.ranking_profiles;
drop policy if exists "ranking profile delete authenticated development" on public.ranking_profiles;
create policy "ranking profile insert development" on public.ranking_profiles for insert with check (true);
create policy "ranking profile update owner development" on public.ranking_profiles for update using (true) with check (true);
create policy "ranking profile delete development" on public.ranking_profiles for delete using (true);

drop policy if exists "room create development" on public.rooms;
drop policy if exists "room update participants development" on public.rooms;
drop policy if exists "room delete development" on public.rooms;
drop policy if exists "rooms insert authenticated development" on public.rooms;
drop policy if exists "rooms update authenticated development" on public.rooms;
drop policy if exists "rooms delete authenticated development" on public.rooms;
create policy "room create development" on public.rooms for insert with check (true);
create policy "room update participants development" on public.rooms for update using (true) with check (true);
create policy "room delete development" on public.rooms for delete using (true);

drop policy if exists "room players insert development" on public.room_players;
drop policy if exists "room players update own development" on public.room_players;
drop policy if exists "room players delete development" on public.room_players;
drop policy if exists "room players insert authenticated development" on public.room_players;
drop policy if exists "room players update authenticated development" on public.room_players;
drop policy if exists "room players delete authenticated development" on public.room_players;
create policy "room players insert development" on public.room_players for insert with check (true);
create policy "room players update own development" on public.room_players for update using (true) with check (true);
create policy "room players delete development" on public.room_players for delete using (true);

drop policy if exists "ranked matches insert development" on public.ranked_matches;
drop policy if exists "ranked matches update participants development" on public.ranked_matches;
drop policy if exists "ranked matches delete development" on public.ranked_matches;
drop policy if exists "ranked matches insert authenticated development" on public.ranked_matches;
drop policy if exists "ranked matches update authenticated development" on public.ranked_matches;
drop policy if exists "ranked matches delete authenticated development" on public.ranked_matches;
create policy "ranked matches insert development" on public.ranked_matches for insert with check (true);
create policy "ranked matches update participants development" on public.ranked_matches for update using (true) with check (true);
create policy "ranked matches delete development" on public.ranked_matches for delete using (true);

-- Realtime publication for room and ranked-match UI updates.
-- Supabase projects usually include the supabase_realtime publication already.
-- If a table is already in the publication, duplicate_object is ignored.
do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.room_players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.ranked_matches;
exception when duplicate_object then null;
end $$;

-- Room feature compatibility columns for existing projects.
alter table public.rooms add column if not exists room_code text;
alter table public.rooms add column if not exists host_user_id text;
alter table public.rooms add column if not exists host_nickname text;
alter table public.rooms add column if not exists title text;
alter table public.rooms add column if not exists status text default 'waiting';
alter table public.rooms add column if not exists max_players integer default 4;
alter table public.rooms add column if not exists difficulty text default 'normal';
alter table public.rooms add column if not exists question_count integer default 5;
alter table public.rooms add column if not exists question_set jsonb;
alter table public.rooms add column if not exists include_short_answer boolean default true;
alter table public.rooms add column if not exists has_time_limit boolean default false;
alter table public.rooms add column if not exists time_limit_enabled boolean default false;
alter table public.rooms add column if not exists time_per_question integer default 60;
alter table public.rooms add column if not exists selected_types jsonb;
alter table public.rooms add column if not exists started_at timestamptz;
alter table public.rooms add column if not exists finished_at timestamptz;
alter table public.rooms add column if not exists cancelled_at timestamptz;
alter table public.rooms add column if not exists updated_at timestamptz default now();

alter table public.room_players add column if not exists user_id text;
alter table public.room_players add column if not exists nickname text;
alter table public.room_players add column if not exists is_host boolean default false;
alter table public.room_players add column if not exists is_ready boolean default false;
alter table public.room_players add column if not exists status text default 'joined';
alter table public.room_players add column if not exists current_index integer default 0;
alter table public.room_players add column if not exists current_score numeric default 0;
alter table public.room_players add column if not exists correct_count integer default 0;
alter table public.room_players add column if not exists partial_count integer default 0;
alter table public.room_players add column if not exists wrong_count integer default 0;
alter table public.room_players add column if not exists total_time numeric default 0;
alter table public.room_players add column if not exists joined_at timestamptz default now();
alter table public.room_players add column if not exists finished_at timestamptz;
alter table public.room_players add column if not exists updated_at timestamptz default now();

create unique index if not exists unique_room_players_room_user
on public.room_players(room_id, user_id);

create index if not exists idx_rooms_status_created_at
on public.rooms(status, created_at);

create index if not exists idx_room_players_room_id
on public.room_players(room_id);

create index if not exists idx_room_players_user_id
on public.room_players(user_id);

alter table public.ranked_matches add column if not exists player1_user_id text;
alter table public.ranked_matches add column if not exists player2_user_id text;
alter table public.ranked_matches add column if not exists player1_nickname text;
alter table public.ranked_matches add column if not exists player2_nickname text;
alter table public.ranked_matches add column if not exists question_set jsonb;
alter table public.ranked_matches add column if not exists player1_result jsonb;
alter table public.ranked_matches add column if not exists player2_result jsonb;
alter table public.ranked_matches add column if not exists is_bot_match boolean default false;
alter table public.ranked_matches add column if not exists bot_user_id text;
alter table public.ranked_matches add column if not exists bot_nickname text;
alter table public.ranked_matches add column if not exists bot_profile jsonb;
alter table public.ranked_matches add column if not exists bot_result jsonb;
alter table public.ranked_matches add column if not exists winner_user_id text;
alter table public.ranked_matches add column if not exists started_at timestamptz;
alter table public.ranked_matches add column if not exists finished_at timestamptz;
alter table public.ranked_matches add column if not exists cancelled_at timestamptz;
alter table public.ranked_matches add column if not exists updated_at timestamptz default now();

alter table public.ranking_profiles add column if not exists nickname text;
alter table public.ranking_profiles add column if not exists rating integer default 1000;
alter table public.ranking_profiles add column if not exists tier text default '랭킹없음';
alter table public.ranking_profiles add column if not exists tier_icon text default '';
alter table public.ranking_profiles add column if not exists wins integer default 0;
alter table public.ranking_profiles add column if not exists losses integer default 0;
alter table public.ranking_profiles add column if not exists draws integer default 0;
alter table public.ranking_profiles add column if not exists ranked_games integer default 0;
alter table public.ranking_profiles add column if not exists percentile numeric;
alter table public.ranking_profiles add column if not exists rank_position integer;
alter table public.ranking_profiles add column if not exists total_ranked_players integer;
alter table public.ranking_profiles add column if not exists is_guest boolean default true;
alter table public.ranking_profiles add column if not exists updated_at timestamptz default now();

create index if not exists idx_ranked_matches_status_created_at
on public.ranked_matches(status, created_at desc);

create index if not exists idx_ranked_matches_player1
on public.ranked_matches(player1_user_id);

create index if not exists idx_ranked_matches_player2
on public.ranked_matches(player2_user_id);

create index if not exists idx_ranking_profiles_rating
on public.ranking_profiles(rating desc);

-- Important for existing UUID projects:
-- If users.user_id, room_players.user_id, rooms.host_user_id, ranked_matches.player*_user_id,
-- or ranking_profiles.user_id already exist as uuid, PostgreSQL cannot safely change them to
-- text with these non-destructive add-column statements. For the current no-login test mode,
-- run supabase-test-guest-schema.sql as a development reset so guest_xxx IDs can be inserted.
