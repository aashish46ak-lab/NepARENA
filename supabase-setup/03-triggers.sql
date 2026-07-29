create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  if lower(new.email) = 'aashish46ak@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'owner')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, username)
select id, split_part(email, '@', 1) from auth.users where lower(email) = 'aashish46ak@gmail.com'
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select id, 'owner'::public.app_role from auth.users where lower(email) = 'aashish46ak@gmail.com'
on conflict (user_id, role) do nothing;
