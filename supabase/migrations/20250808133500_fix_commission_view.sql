-- Fix commissions calculation in revenue view: 1% (or profile.commission_rate) of paid invoices
create or replace view public.v_revenue_and_commissions as
select 
  sr.realtor_id,
  sum(case when i.status = 'paid' then coalesce(i.amount_usdt,0) else 0 end) as paid_turnover_usdt,
  sum(case when i.status = 'paid' then coalesce(i.amount_usdt,0) * coalesce(pr.commission_rate, 0.01) else 0 end) as commissions_usdt,
  count(distinct case when i.status = 'paid' then i.id end) as paid_invoices,
  count(distinct sr.id) as total_sales_requests
from public.sales_requests sr
left join public.invoices i on i.sales_request_id = sr.id
left join public.profiles pr on pr.id = sr.realtor_id
group by sr.realtor_id; 