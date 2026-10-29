-- Busca por palavras da ementa sem varrer a tabela inteira (índice de trigramas).
create extension if not exists pg_trgm with schema extensions;
create index if not exists proposicoes_ementa_trgm on public.proposicoes using gin (ementa extensions.gin_trgm_ops);
