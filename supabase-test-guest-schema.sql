-- Development test guest mode schema.
-- WARNING: This drops prototype data. Run only when you intentionally reset the dev Supabase project.

create extension if not exists "pgcrypto";

drop table if exists public.replay_items cascade;
drop table if exists public.replays cascade;
drop table if exists public.ranked_matches cascade;
drop table if exists public.ranking_profiles cascade;
drop table if exists public.room_players cascade;
drop table if exists public.room_matches cascade;
drop table if exists public.rooms cascade;
drop table if exists public.questions_cache cascade;
drop table if exists public.users cascade;

create table public.users (
  user_id text primary key,
  nickname text,
  nickname_normalized text,
  provider text default 'test_guest',
  is_guest boolean default true,
  email text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index unique_users_nickname_normalized
on public.users(nickname_normalized)
where nickname_normalized is not null;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  host_user_id text references public.users(user_id),
  host_nickname text,
  title text,
  max_players integer default 4,
  status text default 'waiting',
  difficulty text default 'normal',
  question_count integer default 5,
  include_short_answer boolean default true,
  has_time_limit boolean default false,
  time_limit_enabled boolean default false,
  time_per_question integer default 60,
  selected_types jsonb,
  question_set jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz
);

create table public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  user_id text references public.users(user_id),
  nickname text,
  is_host boolean default false,
  is_ready boolean default false,
  current_index integer default 0,
  current_score numeric default 0,
  correct_count integer default 0,
  partial_count integer default 0,
  wrong_count integer default 0,
  total_time numeric default 0,
  status text default 'joined',
  joined_at timestamptz default now(),
  updated_at timestamptz default now(),
  finished_at timestamptz,
  unique(room_id, user_id)
);

create table public.room_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  winner_user_id text references public.users(user_id),
  result_summary jsonb,
  created_at timestamptz default now()
);

create table public.ranking_profiles (
  user_id text primary key references public.users(user_id) on delete cascade,
  nickname text,
  rating integer default 1000,
  tier text default '랭킹없음',
  tier_icon text default '',
  division integer default 5,
  wins integer default 0,
  losses integer default 0,
  draws integer default 0,
  ranked_games integer default 0,
  percentile numeric,
  rank_position integer,
  total_ranked_players integer,
  win_streak integer default 0,
  lose_streak integer default 0,
  promotion_series_active boolean default false,
  promotion_wins integer default 0,
  promotion_losses integer default 0,
  is_guest boolean default true,
  updated_at timestamptz default now()
);

create table public.ranked_matches (
  id uuid primary key default gen_random_uuid(),
  player1_user_id text references public.users(user_id),
  player2_user_id text references public.users(user_id),
  player1_nickname text,
  player2_nickname text,
  winner_user_id text references public.users(user_id),
  status text default 'matching',
  difficulty text default 'normal',
  question_count integer default 5,
  question_set jsonb,
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
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz
);

create table public.replays (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(user_id),
  nickname text,
  mode text default 'solo',
  related_match_id uuid,
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
  public_title text,
  view_count integer default 0,
  like_count integer default 0,
  created_at timestamptz default now()
);

create table public.replay_items (
  id uuid primary key default gen_random_uuid(),
  replay_id uuid references public.replays(id) on delete cascade,
  question_index integer,
  question_snapshot jsonb,
  user_answer jsonb,
  grading_result jsonb,
  elapsed_time numeric,
  is_correct boolean,
  is_partial boolean,
  is_timeout boolean,
  explanation_snapshot text,
  analysis_snapshot jsonb,
  created_at timestamptz default now()
);

create table public.questions_cache (
  id uuid primary key default gen_random_uuid(),
  difficulty text,
  selected_types jsonb,
  include_short_answer boolean default true,
  question_count integer default 0,
  questions jsonb,
  created_by text references public.users(user_id),
  created_at timestamptz default now()
);

create index idx_rooms_status_created_at on public.rooms(status, created_at desc);
create index idx_room_players_room_id on public.room_players(room_id);
create index idx_room_players_user_id on public.room_players(user_id);
create index idx_ranked_matches_status_created_at on public.ranked_matches(status, created_at desc);
create index idx_ranked_matches_player1 on public.ranked_matches(player1_user_id);
create index idx_ranked_matches_player2 on public.ranked_matches(player2_user_id);
create index idx_ranking_profiles_rating on public.ranking_profiles(rating desc);

alter table public.users enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_matches enable row level security;
alter table public.ranking_profiles enable row level security;
alter table public.ranked_matches enable row level security;
alter table public.replays enable row level security;
alter table public.replay_items enable row level security;
alter table public.questions_cache enable row level security;

create policy "test guest users all" on public.users for all using (true) with check (true);
create policy "test guest rooms all" on public.rooms for all using (true) with check (true);
create policy "test guest room players all" on public.room_players for all using (true) with check (true);
create policy "test guest room matches all" on public.room_matches for all using (true) with check (true);
create policy "test guest ranking profiles all" on public.ranking_profiles for all using (true) with check (true);
create policy "test guest ranked matches all" on public.ranked_matches for all using (true) with check (true);
create policy "test guest replays all" on public.replays for all using (true) with check (true);
create policy "test guest replay items all" on public.replay_items for all using (true) with check (true);
create policy "test guest questions cache all" on public.questions_cache for all using (true) with check (true);

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
