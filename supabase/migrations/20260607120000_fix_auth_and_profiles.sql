/*
  # Fix authentication: create missing profiles table, add profile_completed, harden signup trigger

  Background:
  - The app and the `handle_new_user()` signup trigger both depend on a
    `public.profiles` table, but no migration ever created it. On job-seeker
    signup the trigger ran `INSERT INTO public.profiles ...` and threw, which
    made Supabase abort the signup with "Database error saving new user".
  - The app routes on `profile_completed` (profiles & companies), but that
    column was never created, so users were bounced to "Complete Profile"
    forever even after a successful login.

  This migration is fully idempotent and safe to run whether or not a
  `profiles` table already exists.

  1. Tables
    - Create `public.profiles` if missing (job-seeker profiles).
    - Ensure all columns the app reads/writes exist on `profiles`.
    - Add `profile_completed` to `profiles` and `companies`.

  2. Security
    - Enable RLS on `profiles`; users manage their own row; authenticated
      users can read profiles (employers view applicants).

  3. Trigger
    - Rewrite `handle_new_user()` so it can never abort a signup
      (ON CONFLICT DO NOTHING + EXCEPTION fallback).
*/

-- 1) Create the profiles table if it does not already exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  first_name text,
  last_name text,
  profile_picture text,
  description text,
  files jsonb DEFAULT '[]'::jsonb,
  profile_completed boolean DEFAULT false
);

-- Ensure every column the app uses exists (covers a pre-existing table)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_picture text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add profile_completed to companies for the same routing logic
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- 2) Row Level Security for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profiles_updated_at();

-- 3) Harden the signup trigger so it can NEVER block account creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _user_type TEXT;
  _full_name TEXT;
  _first_name TEXT;
  _last_name TEXT;
BEGIN
  _user_type := NEW.raw_user_meta_data->>'user_type';
  _full_name := NEW.raw_user_meta_data->>'full_name';

  _first_name := COALESCE(NULLIF(split_part(COALESCE(_full_name, ''), ' ', 1), ''), '');
  _last_name  := COALESCE(NULLIF(split_part(COALESCE(_full_name, ''), ' ', 2), ''), '');

  IF _user_type = 'company' THEN
    -- Placeholder company row; real details are filled in during profile
    -- completion. Suffix with part of the id so the UNIQUE(company_name)
    -- constraint can never collide on the placeholder.
    INSERT INTO public.companies (user_id, company_name)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(_full_name, ''), 'New Company') || ' (' || left(NEW.id::text, 8) || ')'
    )
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.profiles (id, first_name, last_name)
    VALUES (NEW.id, _first_name, _last_name)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  -- Never let a bookkeeping error abort the user signup itself.
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for % : %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
