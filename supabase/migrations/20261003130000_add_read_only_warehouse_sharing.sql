create table public.workshop_warehouse_access (
  owner_id uuid not null references auth.users (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id),
  check (owner_id <> viewer_id)
);

alter table public.workshop_warehouse_access enable row level security;

create policy "owners manage warehouse sharing"
  on public.workshop_warehouse_access for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "viewers can see their warehouse grants"
  on public.workshop_warehouse_access for select to authenticated
  using (auth.uid() = viewer_id);

grant select, insert, update, delete on public.workshop_warehouse_access to authenticated;

drop policy "users manage their warehouse entries" on public.workshop_warehouse_entries;
drop policy "users manage their warehouse stock" on public.workshop_warehouse_stock;
drop policy "users manage their warehouse movements" on public.workshop_warehouse_movements;
drop policy "users manage their warehouse models" on public.workshop_warehouse_models;

create policy "warehouse owners manage entries"
  on public.workshop_warehouse_entries for all to authenticated
  using (auth.uid() = user_id and not exists (
    select 1 from public.workshop_warehouse_access access where access.viewer_id = auth.uid()
  ))
  with check (auth.uid() = user_id and not exists (
    select 1 from public.workshop_warehouse_access access where access.viewer_id = auth.uid()
  ));

create policy "warehouse owners manage stock"
  on public.workshop_warehouse_stock for all to authenticated
  using (auth.uid() = user_id and not exists (
    select 1 from public.workshop_warehouse_access access where access.viewer_id = auth.uid()
  ))
  with check (auth.uid() = user_id and not exists (
    select 1 from public.workshop_warehouse_access access where access.viewer_id = auth.uid()
  ));

create policy "warehouse owners manage movements"
  on public.workshop_warehouse_movements for all to authenticated
  using (auth.uid() = user_id and not exists (
    select 1 from public.workshop_warehouse_access access where access.viewer_id = auth.uid()
  ))
  with check (auth.uid() = user_id and not exists (
    select 1 from public.workshop_warehouse_access access where access.viewer_id = auth.uid()
  ));

create policy "warehouse owners manage models"
  on public.workshop_warehouse_models for all to authenticated
  using (auth.uid() = user_id and not exists (
    select 1 from public.workshop_warehouse_access access where access.viewer_id = auth.uid()
  ))
  with check (auth.uid() = user_id and not exists (
    select 1 from public.workshop_warehouse_access access where access.viewer_id = auth.uid()
  ));

create policy "shared users can read warehouse entries"
  on public.workshop_warehouse_entries for select to authenticated
  using (exists (
    select 1 from public.workshop_warehouse_access access
    where access.owner_id = workshop_warehouse_entries.user_id
      and access.viewer_id = auth.uid()
  ));

create policy "shared users can read warehouse stock"
  on public.workshop_warehouse_stock for select to authenticated
  using (exists (
    select 1 from public.workshop_warehouse_access access
    where access.owner_id = workshop_warehouse_stock.user_id
      and access.viewer_id = auth.uid()
  ));

create policy "shared users can read warehouse movements"
  on public.workshop_warehouse_movements for select to authenticated
  using (exists (
    select 1 from public.workshop_warehouse_access access
    where access.owner_id = workshop_warehouse_movements.user_id
      and access.viewer_id = auth.uid()
  ));

create policy "shared users can read warehouse models"
  on public.workshop_warehouse_models for select to authenticated
  using (exists (
    select 1 from public.workshop_warehouse_access access
    where access.owner_id = workshop_warehouse_models.user_id
      and access.viewer_id = auth.uid()
  ));