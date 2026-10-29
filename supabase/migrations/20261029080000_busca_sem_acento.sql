-- Busca na ementa sem diferenciar acentos nem maiúsculas ("saneamento basico" acha "SANEAMENTO BÁSICO").
-- O índice proposicoes_ementa_trgm (migração anterior) deixa de ser usado; remover só com confirmação.
create or replace function public.sem_acento(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select translate(lower(t), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
$$;

create index if not exists proposicoes_ementa_busca on public.proposicoes using gin (public.sem_acento(ementa) extensions.gin_trgm_ops);

-- termo já chega sem acento, em minúsculas e só com letras, números e espaços; as palavras aparecem nessa ordem
create or replace function public.buscar_proposicoes(termo text, limite int default 20)
returns setof public.proposicoes
language sql stable security invoker set search_path = public, extensions as $$
  select p.* from public.proposicoes p
  where public.sem_acento(p.ementa) like '%' || regexp_replace(trim(termo), '\s+', '%', 'g') || '%'
  order by p.apresentada_em desc
  limit least(limite, 50)
$$;
