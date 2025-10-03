-- Дневная агрегация просмотров
create table if not exists public.property_view_daily (
  property_id uuid not null references public.properties(id) on delete cascade,
  day date not null,
  views integer not null default 0,
  primary key(property_id, day)
);

alter table public.property_view_daily enable row level security;
-- Чтение всем аутентифицированным (агрегированные данные)
drop policy if exists "read_view_daily" on public.property_view_daily;
create policy "read_view_daily" on public.property_view_daily
  for select to authenticated
  using (true);

-- Обновление RPC: инкремент просмотров и запись в дневную таблицу
create or replace function public.increment_property_views(property_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.properties
    set views_count = coalesce(views_count, 0) + 1
    where id = increment_property_views.property_id;

  insert into public.property_view_daily(property_id, day, views)
    values (increment_property_views.property_id, current_date, 1)
  on conflict (property_id, day)
  do update set views = public.property_view_daily.views + 1;
end;
$$;

-- Воронка по дням (глобально)
create or replace view public.v_funnel_daily as
with v as (
  select day, sum(views) as views
  from public.property_view_daily
  group by day
),
 b as (
  select date_trunc('day', created_at)::date as day, count(*) as bookings
  from public.bookings
  group by 1
),
 s as (
  select date_trunc('day', created_at)::date as day, count(*) as sales
  from public.sales_requests
  group by 1
),
 p as (
  select date_trunc('day', created_at)::date as day, count(*) as payments
  from public.invoices
  where status = 'paid'
  group by 1
)
select d.day,
       coalesce(v.views,0)::bigint as views,
       coalesce(b.bookings,0)::bigint as bookings,
       coalesce(s.sales,0)::bigint as sales,
       coalesce(p.payments,0)::bigint as payments
from (
  select generate_series(
    (select coalesce(min(day), current_date) from public.property_view_daily),
    current_date,
    interval '1 day'
  )::date as day
) d
left join v on v.day = d.day
left join b on b.day = d.day
left join s on s.day = d.day
left join p on p.day = d.day
order by d.day desc;

-- Воронка по дням по риелтору
create or replace view public.v_realtor_funnel_daily as
with v as (
  select p.realtor_id, d.day, sum(d.views) as views
  from public.property_view_daily d
  join public.properties p on p.id = d.property_id
  group by 1,2
),
 b as (
  select p.realtor_id, date_trunc('day', bk.created_at)::date as day, count(*) as bookings
  from public.bookings bk
  join public.properties p on p.id = bk.property_id
  group by 1,2
),
 s as (
  select sr.realtor_id, date_trunc('day', sr.created_at)::date as day, count(*) as sales
  from public.sales_requests sr
  group by 1,2
),
 pmt as (
  select sr.realtor_id, date_trunc('day', i.created_at)::date as day, count(*) as payments
  from public.invoices i
  join public.sales_requests sr on sr.id = i.sales_request_id
  where i.status = 'paid'
  group by 1,2
)
select d.day,
       r.realtor_id,
       coalesce(v.views,0)::bigint as views,
       coalesce(b.bookings,0)::bigint as bookings,
       coalesce(s.sales,0)::bigint as sales,
       coalesce(pmt.payments,0)::bigint as payments
from (
  select generate_series(
    (select coalesce(min(day), current_date) from public.property_view_daily),
    current_date,
    interval '1 day'
  )::date as day
) d
join (select distinct realtor_id from public.properties) r on true
left join v on v.realtor_id = r.realtor_id and v.day = d.day
left join b on b.realtor_id = r.realtor_id and b.day = d.day
left join s on s.realtor_id = r.realtor_id and s.day = d.day
left join pmt on pmt.realtor_id = r.realtor_id and pmt.day = d.day
order by d.day desc;

-- Отчет по выручке и комиссиям
create or replace view public.v_revenue_and_commissions as
select 
  sr.realtor_id,
  sum(case when i.status = 'paid' then coalesce(i.amount_usdt,0) else 0 end) as paid_turnover_usdt,
  sum(coalesce(sc.amount_usdt,0)) as commissions_usdt,
  count(distinct case when i.status = 'paid' then i.id end) as paid_invoices,
  count(distinct sr.id) as total_sales_requests
from public.sales_requests sr
left join public.invoices i on i.sales_request_id = sr.id
left join public.sales_commissions sc on sc.sales_request_id = sr.id
group by sr.realtor_id;

-- Политики на вьюхи (просмотр аутентифицированным; RLS не действует на VIEW, но ограничим через policies на базовых таблицах)
-- Ничего добавлять не требуется; доступ контролируется RLS базовых таблиц. 