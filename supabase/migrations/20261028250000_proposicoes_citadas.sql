-- Todas as proposições que a fonte oficial associa a cada votação (na ordem do arquivo).
-- Serve para escolher a principal (a citada na descrição) e para carregar proposições antigas votadas depois.
alter table public.votacoes add column if not exists proposicoes_citadas text[] not null default '{}';
