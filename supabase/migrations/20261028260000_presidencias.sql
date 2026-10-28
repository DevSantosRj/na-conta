-- Quem presidiu a República, a Câmara e o Senado, conforme as listas oficiais de cada instituição.
-- Datas exatas quando a fonte informa; senão só os anos. Partido só quando a fonte informa.

create table public.presidencias (
  id bigint generated always as identity primary key,
  cargo text not null check (cargo in ('republica', 'camara', 'senado')),
  periodo text not null,
  ordem int not null,
  nome text not null,
  partido text,
  uf text,
  inicio date,
  fim date,
  ano_inicio int not null,
  ano_fim int,
  observacao text,
  parlamentar_id text references public.parlamentares(id) on delete set null,
  fonte_url text not null,
  coletado_em timestamptz not null default now(),
  unique (cargo, ordem)
);

create index on public.presidencias (cargo, ano_inicio);
create index on public.presidencias (parlamentar_id);

alter table public.presidencias enable row level security;
create policy "leitura publica" on public.presidencias for select to anon, authenticated using (true);
revoke insert, update, delete on public.presidencias from anon, authenticated;
