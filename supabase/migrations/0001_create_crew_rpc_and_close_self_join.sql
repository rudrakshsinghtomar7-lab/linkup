-- Applied 2026-09-12 (via Supabase MCP apply_migration; the project's earlier schema predates this repo).
-- Crew creation moves into a SECURITY DEFINER RPC so the "join a crew" self-insert policy
-- (which let anyone with a crew uuid add themselves) can be dropped. Joining stays via join_crew(code).
create or replace function public.create_crew(crew_name text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;
  if crew_name is null or length(trim(crew_name)) = 0 then
    raise exception 'crew name required';
  end if;
  insert into crews (name, created_by) values (left(trim(crew_name), 60), auth.uid()) returning id into new_id;
  insert into crew_members (crew_id, user_id, role) values (new_id, auth.uid(), 'owner');
  return new_id;
end;
$$;

revoke all on function public.create_crew(text) from public;
grant execute on function public.create_crew(text) to authenticated;
revoke all on function public.join_crew(text) from public;
grant execute on function public.join_crew(text) to authenticated;

drop policy if exists "join a crew" on public.crew_members;
drop policy if exists "create crews" on public.crews;
