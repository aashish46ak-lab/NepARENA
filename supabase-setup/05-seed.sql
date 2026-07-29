insert into public.site_settings (site_name, tagline, hero_title, hero_subtitle, about_short, footer_text)
select 'eFootball Nepal', 'The official home of competitive eFootball in Nepal.',
       'Nepal''s home for competitive eFootball',
       'Weekly tournaments, national rankings, and a fast-growing community of Nepali eFootball players.',
       'eFootball Nepal is the official platform organizing competitive eFootball tournaments and community events across Nepal.',
       '© eFootball Nepal'
where not exists (select 1 from public.site_settings);

insert into public.owner_info (name, title, bio, email)
select 'Aashish', 'Founder & Owner',
       'Passionate about growing the eFootball scene in Nepal and giving local players a stage to compete.',
       'aashish46ak@gmail.com'
where not exists (select 1 from public.owner_info);

insert into public.tournaments (slug, name, description, status, registration_open, prize_pool, participants_count, starts_at)
select 'efn-season-1', 'eFootball Nepal — Season 1',
       'Our inaugural nationwide tournament. Open bracket, single elimination, live-streamed finals.',
       'registration_open', true, 'Rs. 50,000', 32, now() + interval '14 days'
where not exists (select 1 from public.tournaments);

insert into public.announcements (title, body, is_pinned)
select 'Welcome to eFootball Nepal!',
       'Registrations for Season 1 are now open. Join the community, sign up, and represent your club on Nepal''s biggest eFootball stage.',
       true
where not exists (select 1 from public.announcements);

insert into public.community_links (platform, label, url, icon, sort_order)
select * from (values
  ('Discord','Join our Discord','https://discord.gg/','MessageCircle',1),
  ('Facebook','Follow on Facebook','https://facebook.com/','Facebook',2),
  ('YouTube','Watch on YouTube','https://youtube.com/','Youtube',3),
  ('WhatsApp','Community WhatsApp','https://wa.me/','MessageSquare',4)
) as v(platform,label,url,icon,sort_order)
where not exists (select 1 from public.community_links);
