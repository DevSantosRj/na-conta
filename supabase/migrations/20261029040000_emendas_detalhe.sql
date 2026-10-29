-- Emendas parlamentares (Portal da Transparência, download em lote): autor como publicado, tipo, localidade e ação.
-- parlamentar_id só é preenchido quando o nome do autor corresponde a um único parlamentar do banco.
alter table public.emendas alter column uf drop not null;
alter table public.emendas add column if not exists tipo text;
alter table public.emendas add column if not exists autor text;
alter table public.emendas add column if not exists autor_codigo text;
alter table public.emendas add column if not exists numero text;
alter table public.emendas add column if not exists localidade text;
alter table public.emendas add column if not exists acao text;
alter table public.emendas add column if not exists valor_liquidado numeric(16, 2) not null default 0;
alter table public.emendas add column if not exists valor_rap_pago numeric(16, 2) not null default 0;
create index if not exists emendas_ano_idx on public.emendas (ano);
create index if not exists emendas_uf_idx on public.emendas (uf);
