-- AutomaSuite LeadGen Pro — isolated first-release schema.
-- Apply ONLY to a dedicated LeadGen Pro Supabase project, never to existing production projects.
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  company text,
  email text,
  phone text,
  source text not null default 'Manual entry',
  status text not null default 'New' check (status in ('New','Qualified','Contacted','Nurturing','Converted','Not a fit')),
  score integer not null default 0 check (score between 0 and 100),
  buying_signal text,
  next_action text,
  last_contacted_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_owner_created_idx on public.leads(owner_id, created_at desc);
create index if not exists leads_owner_status_idx on public.leads(owner_id, status);
create index if not exists leads_owner_score_idx on public.leads(owner_id, score desc);
create unique index if not exists leads_owner_email_unique on public.leads(owner_id, lower(email)) where email is not null and email <> '';

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  activity_type text not null check (activity_type in ('note','status_change','email','whatsapp','call','meeting','signal','task')),
  title text not null,
  details text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists lead_activities_owner_lead_idx on public.lead_activities(owner_id, lead_id, occurred_at desc);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  channel text not null default 'WhatsApp' check (channel in ('WhatsApp','Email','Manual')),
  status text not null default 'Draft' check (status in ('Draft','Scheduled','Active','Paused','Completed')),
  message_template text,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaigns_owner_created_idx on public.campaigns(owner_id, created_at desc);

create table if not exists public.lead_signals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  signal_type text not null,
  evidence text not null,
  source_url text,
  observed_at timestamptz not null default now(),
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  recommended_action text not null default 'Research / nurture' check (recommended_action in ('Contact now','Research / nurture',"Don't contact yet")),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists lead_signals_owner_observed_idx on public.lead_signals(owner_id, observed_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();
drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at before update on public.campaigns for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.campaigns enable row level security;
alter table public.lead_signals enable row level security;

create policy "Owners manage their leads" on public.leads for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage their lead activities" on public.lead_activities for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage their campaigns" on public.campaigns for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage their signals" on public.lead_signals for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

comment on table public.leads is 'AutomaSuite LeadGen Pro contacts. Row-level security scopes every record to its owner.';
comment on table public.lead_signals is 'Evidence-backed signals for reason-for-outreach and contact/nurture/wait decisions.';
