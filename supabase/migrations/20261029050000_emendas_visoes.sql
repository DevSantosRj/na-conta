-- Resumos de emendas para as páginas de estado e município (pago = pago no ano + restos a pagar pagos depois)
create view public.emendas_por_municipio with (security_invoker = true) as
select municipio_id, uf, count(*) as emendas, sum(valor_empenhado) as empenhado, sum(valor_pago + valor_rap_pago) as pago,
       min(ano) as primeiro_ano, max(ano) as ultimo_ano
from public.emendas where municipio_id is not null
group by municipio_id, uf;

create view public.emendas_por_uf_ano with (security_invoker = true) as
select uf, ano, count(*) as emendas, sum(valor_empenhado) as empenhado, sum(valor_pago + valor_rap_pago) as pago
from public.emendas where uf is not null
group by uf, ano;

grant select on public.emendas_por_municipio, public.emendas_por_uf_ano to anon, authenticated;
