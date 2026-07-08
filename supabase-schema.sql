create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  auth_user_id uuid null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  host_user_id uuid references public.users(id),
  status text check (status in ('waiting', 'playing', 'finished', 'cancelled')) default 'waiting',
  difficulty text,
  question_count integer,
  include_short_answer boolean,
  time_limit_enabled boolean,
  time_per_question integer,
  selected_types jsonb,
  question_set jsonb,
  created_at timestamp with time zone default now(),
  started_at timestamp with time zone null,
  finished_at timestamp with time zone null
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.users(id),
  nickname text,
  is_host boolean default false,
  is_ready boolean default false,
  current_index integer default 0,
  current_score numeric default 0,
  correct_count integer default 0,
  partial_count integer default 0,
  wrong_count integer default 0,
  total_time integer default 0,
  status text check (status in ('joined', 'ready', 'playing', 'finished', 'left')) default 'joined',
  joined_at timestamp with time zone default now(),
  finished_at timestamp with time zone null,
  unique(room_id, user_id)
);

create table if not exists public.room_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  winner_user_id uuid references public.users(id) null,
  result_summary jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.ranking_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  nickname text not null,
  rating integer default 1000,
  tier text default '랭킹없음',
  tier_icon text default '◽',
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
  player_a_id uuid references public.users(id),
  player_b_id uuid references public.users(id),
  winner_user_id uuid references public.users(id) null,
  status text check (status in ('matching', 'playing', 'finished', 'cancelled')) default 'matching',
  difficulty text,
  question_count integer,
  question_set jsonb,
  player_a_result jsonb,
  player_b_result jsonb,
  rating_delta_a integer default 0,
  rating_delta_b integer default 0,
  promotion_result_a jsonb,
  promotion_result_b jsonb,
  created_at timestamp with time zone default now(),
  started_at timestamp with time zone null,
  finished_at timestamp with time zone null
);

create table if not exists public.replays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
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
  user_id uuid references public.users(id),
  created_at timestamp with time zone default now(),
  unique(replay_id, user_id)
);

create unique index if not exists unique_room_players_room_user
on public.room_players(room_id, user_id);

alter table public.ranking_profiles
add column if not exists ranked_games integer default 0;

alter table public.ranking_profiles
add column if not exists percentile numeric null;

alter table public.ranking_profiles
add column if not exists rank_position integer null;

alter table public.ranking_profiles
add column if not exists total_ranked_players integer default 0;

alter table public.ranking_profiles
add column if not exists tier_icon text default '◽';

create table if not exists public.questions_cache (
  id uuid primary key default gen_random_uuid(),
  difficulty text,
  selected_types jsonb,
  include_short_answer boolean,
  question_count integer,
  questions jsonb,
  created_by uuid references public.users(id) null,
  created_at timestamp with time zone default now()
);

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

-- 개발용 완화 정책이며 실제 서비스 전에는 더 엄격하게 바꿔야 함.
create policy "users readable for anon development" on public.users for select using (true);
create policy "users insert own anonymous id" on public.users for insert with check (true);
create policy "users update own row development" on public.users for update using (true);
create policy "users delete development" on public.users for delete using (true);

create policy "ranking profiles public read" on public.ranking_profiles for select using (true);
create policy "ranking profile insert development" on public.ranking_profiles for insert with check (true);
create policy "ranking profile update owner development" on public.ranking_profiles for update using (true);
create policy "ranking profile delete development" on public.ranking_profiles for delete using (true);

create policy "public replays readable" on public.replays for select using (is_public = true);
create policy "own replays readable development" on public.replays for select using (true);
create policy "replay insert development" on public.replays for insert with check (true);
create policy "replay owner update development" on public.replays for update using (true);

create policy "public replay items readable through replay" on public.replay_items
for select using (exists (select 1 from public.replays r where r.id = replay_id and r.is_public = true));
create policy "own replay items readable development" on public.replay_items for select using (true);
create policy "replay items insert development" on public.replay_items for insert with check (true);
create policy "replay items update development" on public.replay_items for update using (true) with check (true);

create policy "room participant read rooms development" on public.rooms for select using (true);
create policy "room create development" on public.rooms for insert with check (true);
create policy "room update participants development" on public.rooms for update using (true);
create policy "room delete development" on public.rooms for delete using (true);

create policy "room players read development" on public.room_players for select using (true);
create policy "room players insert development" on public.room_players for insert with check (true);
create policy "room players update own development" on public.room_players for update using (true);
create policy "room players delete development" on public.room_players for delete using (true);

create policy "room matches read participants development" on public.room_matches for select using (true);
create policy "room matches insert development" on public.room_matches for insert with check (true);
create policy "room matches update development" on public.room_matches for update using (true) with check (true);
create policy "room matches delete development" on public.room_matches for delete using (true);

create policy "ranked matches read participants development" on public.ranked_matches for select using (true);
create policy "ranked matches insert development" on public.ranked_matches for insert with check (true);
create policy "ranked matches update participants development" on public.ranked_matches for update using (true);
create policy "ranked matches delete development" on public.ranked_matches for delete using (true);

create policy "likes read public" on public.public_replay_likes for select using (true);
create policy "likes insert user" on public.public_replay_likes for insert with check (true);
create policy "likes update development" on public.public_replay_likes for update using (true) with check (true);
create policy "likes delete user" on public.public_replay_likes for delete using (true);

create policy "question cache read development" on public.questions_cache for select using (true);
create policy "question cache insert development" on public.questions_cache for insert with check (true);

create policy "replay update development" on public.replays for update using (true) with check (true);
create policy "replay delete development" on public.replays for delete using (true);
create policy "replay items delete development" on public.replay_items for delete using (true);
create policy "question cache update development" on public.questions_cache for update using (true) with check (true);
create policy "question cache delete development" on public.questions_cache for delete using (true);

-- Production hardening note:
-- Replace the development update/select policies above with auth.uid() checks after Supabase Auth is connected.
-- Anonymous localStorage UUIDs are suitable for early prototypes, not for strong identity guarantees.
