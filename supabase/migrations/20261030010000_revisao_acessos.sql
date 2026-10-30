-- Etapa 5: revisão das regras de acesso.
-- 1) Visões (views) são só de leitura para o público: tira escrita explícita (o RLS das tabelas já barrava).
revoke insert, update, delete, truncate on public.votos_detalhados, public.autorias_detalhadas, public.transferencias_grupos,
  public.pacto_federativo, public.emendas_por_municipio, public.emendas_por_uf_ano from anon, authenticated;

-- 2) perfis: criado só pelo gatilho criar_perfil (no cadastro); ninguém insere à mão.
revoke insert, truncate on public.perfis from anon, authenticated;
revoke truncate on public.seguindo from anon, authenticated;

-- 3) coletas: registro interno dos robôs; o público não lê nem escreve.
revoke all on public.coletas from anon, authenticated;

-- 4) Tabelas criadas no futuro nascem sem escrita para o público (cada uma libera só o que precisar).
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon, authenticated;

-- 5) Comparador: no máximo 2 fichas por lado (Câmara + Senado da mesma pessoa), para ninguém pedir a conta do banco inteiro.
create or replace function public.concordancia(a text[], b text[]) returns table (comuns bigint, iguais bigint)
language sql stable security invoker set search_path = public as $$
  select count(*), count(*) filter (where va.voto = vb.voto) from public.votos va
  join public.votos vb on vb.votacao_id = va.votacao_id
  where cardinality(a) between 1 and 2 and cardinality(b) between 1 and 2
    and va.parlamentar_id = any(a) and vb.parlamentar_id = any(b)
    and va.voto in ('sim','nao') and vb.voto in ('sim','nao'); $$;
