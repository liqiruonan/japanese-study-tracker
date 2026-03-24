-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  study_goal_minutes integer default 30,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create friendships table
create table friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  friend_id uuid references profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, friend_id)
);

-- Create decks table (words/grammar books)
create table decks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  type text check (type in ('vocabulary', 'grammar')) not null,
  is_public boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create cards table (specific words/grammar)
create table cards (
  id uuid default gen_random_uuid() primary key,
  deck_id uuid references decks(id) on delete cascade not null,
  front text not null, -- The word (Kanji) or grammar pattern
  reading text, -- Kana
  meaning text not null,
  part_of_speech text,
  example_sentence text,
  example_translation text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create user_cards table (SRS data for each user for each card)
create table user_cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  card_id uuid references cards(id) on delete cascade not null,
  deck_id uuid references decks(id) on delete cascade not null, -- denormalized for easier querying
  ease_factor real default 2.5 not null,
  interval integer default 0 not null,
  repetitions integer default 0 not null,
  next_review timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, card_id)
);

-- Create study_sessions table
create table study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  end_time timestamp with time zone,
  duration_minutes integer,
  cards_reviewed integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Setup RLS
alter table profiles enable row level security;
alter table friendships enable row level security;
alter table decks enable row level security;
alter table cards enable row level security;
alter table user_cards enable row level security;
alter table study_sessions enable row level security;

-- Profiles: Anyone can read, only owner can update
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Friendships: Users can see their own friendships
create policy "Users can view their friendships" on friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Users can insert their friendships" on friendships for insert with check (auth.uid() = user_id);
create policy "Users can update their friendships" on friendships for update using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Users can delete their friendships" on friendships for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- Decks: Users can view public decks, or their own decks
create policy "Decks are viewable by owner or if public" on decks for select using (auth.uid() = user_id or is_public = true);
create policy "Users can insert their own decks" on decks for insert with check (auth.uid() = user_id);
create policy "Users can update their own decks" on decks for update using (auth.uid() = user_id);
create policy "Users can delete their own decks" on decks for delete using (auth.uid() = user_id);

-- Cards: Users can view cards in decks they can view
create policy "Cards are viewable if deck is viewable" on cards for select using (
  exists (select 1 from decks where decks.id = cards.deck_id and (decks.user_id = auth.uid() or decks.is_public = true))
);
create policy "Users can insert cards to their own decks" on cards for insert with check (true);
create policy "Users can update cards in their own decks" on cards for update using (
  exists (select 1 from decks where decks.id = cards.deck_id and decks.user_id = auth.uid())
);
create policy "Users can delete cards in their own decks" on cards for delete using (
  exists (select 1 from decks where decks.id = cards.deck_id and decks.user_id = auth.uid())
);

-- User Cards: Users can only see/modify their own SRS data
create policy "Users can manage their own user_cards" on user_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Study Sessions: Users can only see/modify their own study sessions
create policy "Users can manage their own study sessions" on study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)), new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
