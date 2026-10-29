-- Cota parlamentar (CEAP na Câmara, CEAPS no Senado): total por parlamentar, mês e categoria.
-- Cada nota fiscal fica no arquivo oficial (fonte_url); aqui guardamos só as somas, para caber no plano gratuito.
create table public.gastos_mensais (
  parlamentar_id text not null references public.parlamentares(id) on delete cascade,
  ano int not null,
  mes int not null check (mes between 1 and 12),
  categoria text not null,
  valor numeric(14, 2) not null,
  documentos int not null,
  fonte_url text not null,
  coletado_em timestamptz not null default now(),
  primary key (parlamentar_id, ano, mes, categoria)
);
create index on public.gastos_mensais (ano);

alter table public.gastos_mensais enable row level security;
create policy "leitura publica" on public.gastos_mensais for select to anon, authenticated using (true);
revoke insert, update, delete on public.gastos_mensais from anon, authenticated;
