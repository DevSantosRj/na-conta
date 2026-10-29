-- Pacto federativo: arrecadação federal por estado (Receita) e transferências constitucionais (Tesouro).
-- As duas tabelas estavam vazias desde o esquema inicial; aqui ganham mês de cobertura e o destino do repasse.
alter table public.arrecadacao add column if not exists meses int not null default 12 check (meses between 1 and 12);

alter table public.transferencias drop constraint if exists transferencias_tipo_check;
alter table public.transferencias add column if not exists destino text not null default 'estado' check (destino in ('estado', 'municipios'));
alter table public.transferencias add column if not exists meses int not null default 12 check (meses between 1 and 12);
alter table public.transferencias drop constraint if exists transferencias_pkey;
alter table public.transferencias add primary key (uf, ano, destino, tipo);

-- Repasses constitucionais recebidos por cada prefeitura (soma anual), para a página do município
create table if not exists public.transferencias_municipios (
  municipio_id int not null references public.municipios(ibge_id),
  ano int not null,
  meses int not null check (meses between 1 and 12),
  fpm numeric(18,2) not null,
  federal numeric(18,2) not null,
  fonte_url text not null,
  coletado_em timestamptz not null default now(),
  primary key (municipio_id, ano)
);
alter table public.transferencias_municipios enable row level security;
create policy "leitura publica" on public.transferencias_municipios for select to anon, authenticated using (true);
revoke insert, update, delete on public.transferencias_municipios from anon, authenticated;
