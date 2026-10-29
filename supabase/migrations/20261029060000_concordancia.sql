-- Comparador: em quantas votações nominais os dois parlamentares votaram (Sim ou Não) e em quantas votaram igual.
-- Recebe os ids de cada pessoa (ficha da Câmara e do Senado ligadas contam juntas).
create or replace function public.concordancia(a text[], b text[])
returns table (comuns bigint, iguais bigint)
language sql stable security invoker set search_path = public as $$
  select count(*), count(*) filter (where va.voto = vb.voto)
  from public.votos va
  join public.votos vb on vb.votacao_id = va.votacao_id
  where va.parlamentar_id = any(a) and vb.parlamentar_id = any(b)
    and va.voto in ('sim', 'nao') and vb.voto in ('sim', 'nao');
$$;
grant execute on function public.concordancia(text[], text[]) to anon, authenticated;
