-- Visões para o perfil do parlamentar: cada voto com a votação e a proposição,
-- e cada autoria com a proposição. security_invoker = respeitam as regras RLS de quem consulta.

create view public.votos_detalhados with (security_invoker = true) as
select
  v.parlamentar_id,
  v.voto,
  v.voto_original,
  vt.id as votacao_id,
  vt.casa,
  vt.data,
  vt.descricao,
  vt.resultado,
  vt.placar_sim,
  vt.placar_nao,
  vt.fonte_url,
  p.id as proposicao_id,
  p.tipo as proposicao_tipo,
  p.numero as proposicao_numero,
  p.ano as proposicao_ano,
  p.ementa as proposicao_ementa,
  p.resumo_ia as proposicao_resumo
from public.votos v
join public.votacoes vt on vt.id = v.votacao_id
left join public.proposicoes p on p.id = vt.proposicao_id;

create view public.autorias_detalhadas with (security_invoker = true) as
select
  a.parlamentar_id,
  a.papel,
  p.id as proposicao_id,
  p.casa,
  p.tipo,
  p.numero,
  p.ano,
  p.ementa,
  p.resumo_ia,
  p.situacao,
  p.apresentada_em,
  p.fonte_url
from public.autorias a
join public.proposicoes p on p.id = a.proposicao_id;

grant select on public.votos_detalhados, public.autorias_detalhadas to anon, authenticated;

create extension if not exists unaccent with schema extensions;
