-- Classificação das transferências constitucionais e visão do pacto federativo por estado.
-- "tipo" guarda "Transferência · Item" exatamente como no arquivo do Tesouro.
-- Só entra na conta da União o que é dinheiro federal: no FUNDEB, as parcelas formadas por impostos do
-- próprio estado (ICMS, IPVA, ITCMD) e a linha DEDU (origem não identificada no arquivo) ficam de fora.
create or replace function public.grupo_transferencia(tipo text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select case
    when split_part(tipo, ' · ', 2) in ('ICMS', 'IPVA', 'ITCMD', 'ICME', 'DEDU') then 'FUNDEB – impostos estaduais'
    when split_part(tipo, ' · ', 1) = 'FPE' then 'FPE'
    when split_part(tipo, ' · ', 1) in ('FPM', 'FPM 1%') then 'FPM'
    when split_part(tipo, ' · ', 2) like 'COUN%' or split_part(tipo, ' · ', 2) like 'AJUSTE FUNDEB%' then 'FUNDEB – complementação da União'
    when split_part(tipo, ' · ', 1) in ('FUNDEB', 'FUNDEF', 'AJUSTE FUNDEB') then 'FUNDEB – parte de repasses federais'
    when split_part(tipo, ' · ', 1) = 'Royalties' then 'Royalties'
    else 'Outros repasses federais'
  end
$$;

create or replace view public.transferencias_grupos with (security_invoker = true) as
select uf, ano, destino, public.grupo_transferencia(tipo) as grupo,
       public.grupo_transferencia(tipo) <> 'FUNDEB – impostos estaduais' as federal,
       sum(valor) as valor, min(meses) as meses
from public.transferencias
group by uf, ano, destino, public.grupo_transferencia(tipo);

create or replace view public.pacto_federativo with (security_invoker = true) as
select a.uf, a.ano, a.valor as arrecadacao, a.meses as meses_arrecadacao,
       coalesce(t.estado, 0) as transferencias_estado,
       coalesce(t.municipios, 0) as transferencias_municipios,
       t.meses as meses_transferencias
from public.arrecadacao a
left join (
  select uf, ano,
         sum(valor) filter (where federal and destino = 'estado') as estado,
         sum(valor) filter (where federal and destino = 'municipios') as municipios,
         min(meses) as meses
  from public.transferencias_grupos group by uf, ano
) t using (uf, ano);
