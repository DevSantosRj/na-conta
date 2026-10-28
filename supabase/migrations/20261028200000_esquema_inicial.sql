-- Na Conta · esquema inicial (aba 05 · Back-end da Planta do App)
-- Dois mundos: dados públicos (escritos só pelos robôs) e dados do assinante (só o dono vê).

-- ===================== DADOS PÚBLICOS =====================

create table public.estados (
  uf text primary key check (uf ~ '^[A-Z]{2}$'),
  nome text not null,
  regiao text not null check (regiao in ('Norte','Nordeste','Centro-Oeste','Sudeste','Sul')),
  populacao bigint,
  cadeiras_camara int not null check (cadeiras_camara between 8 and 70),
  idh numeric(4,3),
  pib_per_capita numeric(14,2),
  fonte_url text not null,
  coletado_em timestamptz not null default now()
);

create table public.municipios (
  ibge_id int primary key,
  nome text not null,
  uf text not null references public.estados(uf),
  fonte_url text not null,
  coletado_em timestamptz not null default now()
);

create table public.parlamentares (
  id text primary key,                         -- 'C-<id da Câmara>' ou 'S-<código do Senado>'
  casa text not null check (casa in ('camara','senado')),
  id_fonte text not null,
  nome_parlamentar text not null,
  nome_civil text not null,
  uf text not null references public.estados(uf),
  partido_atual text,
  foto_url text,
  ativo boolean not null default true,
  fonte_url text not null,
  coletado_em timestamptz not null default now(),
  unique (casa, id_fonte)
);

create table public.mandatos (
  id bigint generated always as identity primary key,
  parlamentar_id text not null references public.parlamentares(id) on delete cascade,
  casa text not null check (casa in ('camara','senado')),
  legislatura int not null,
  uf text not null references public.estados(uf),
  partido text not null,
  inicio date not null,
  fim date,
  fonte_url text not null,
  coletado_em timestamptz not null default now(),
  unique (parlamentar_id, legislatura)
);

create table public.proposicoes (
  id text primary key,                         -- 'C-<id>' ou 'S-<código>'
  casa text not null check (casa in ('camara','senado')),
  tipo text not null,
  numero int not null,
  ano int not null,
  ementa text not null,
  situacao text not null,
  apresentada_em date not null,
  resumo_ia text,
  resumo_modelo text,
  resumo_gerado_em timestamptz,
  fonte_url text not null,
  coletado_em timestamptz not null default now()
);

create table public.autorias (
  proposicao_id text not null references public.proposicoes(id) on delete cascade,
  parlamentar_id text not null references public.parlamentares(id) on delete cascade,
  papel text not null check (papel in ('autor','coautor')),
  fonte_url text not null,
  coletado_em timestamptz not null default now(),
  primary key (proposicao_id, parlamentar_id)
);

create table public.votacoes (
  id text primary key,                         -- 'C-<id>' ou 'S-<código>'
  casa text not null check (casa in ('camara','senado')),
  data timestamptz not null,
  descricao text not null,
  resultado text not null,
  proposicao_id text references public.proposicoes(id) on delete set null,
  fonte_url text not null,
  coletado_em timestamptz not null default now()
);

create table public.votos (
  votacao_id text not null references public.votacoes(id) on delete cascade,
  parlamentar_id text not null references public.parlamentares(id) on delete cascade,
  voto text not null check (voto in ('sim','nao','abstencao','obstrucao','ausente','outro')),
  fonte_url text not null,
  coletado_em timestamptz not null default now(),
  primary key (votacao_id, parlamentar_id)
);

create table public.orientacoes (
  votacao_id text not null references public.votacoes(id) on delete cascade,
  partido text not null,
  orientacao text not null,
  fonte_url text not null,
  coletado_em timestamptz not null default now(),
  primary key (votacao_id, partido)
);

create table public.despesas (
  id text primary key,                         -- identificador do documento na fonte
  parlamentar_id text not null references public.parlamentares(id) on delete cascade,
  ano int not null,
  mes int not null check (mes between 1 and 12),
  tipo text not null,
  fornecedor text not null,
  valor numeric(14,2) not null,
  documento_url text,
  fonte_url text not null,
  coletado_em timestamptz not null default now()
);

create table public.emendas (
  id text primary key,
  codigo text not null,
  ano int not null,
  uf text not null,
  parlamentar_id text references public.parlamentares(id) on delete set null, -- vazio = emenda de bancada
  municipio_id int references public.municipios(ibge_id),
  funcao text,
  valor_empenhado numeric(16,2) not null,
  valor_pago numeric(16,2) not null,
  fonte_url text not null,
  coletado_em timestamptz not null default now()
);

create table public.transferencias (
  uf text not null references public.estados(uf),
  ano int not null,
  tipo text not null check (tipo in ('FPE','FPM','outras')),
  valor numeric(18,2) not null,
  fonte_url text not null,
  coletado_em timestamptz not null default now(),
  primary key (uf, ano, tipo)
);

create table public.arrecadacao (
  uf text not null references public.estados(uf),
  ano int not null,
  valor numeric(18,2) not null,
  fonte_url text not null,
  coletado_em timestamptz not null default now(),
  primary key (uf, ano)
);

-- ===================== DADOS DA EQUIPE =====================

create table public.artigos (
  id text primary key,                         -- ex.: 'art-45-p1'
  titulo text not null,
  texto_oficial text not null,
  texto_simples text,
  por_que_importa text,
  revisado_por text,
  revisado_em date,
  publicado boolean not null default false,
  -- nenhum texto simples vai ao ar sem revisão jurídica
  constraint so_publica_revisado check (not publicado or (revisado_por is not null and revisado_em is not null))
);

create table public.tabelas_imposto (
  ano int not null,
  tipo text not null check (tipo in ('IR','INSS')),
  faixas jsonb not null,
  vigencia date not null,
  primary key (ano, tipo)
);

create table public.coletas (
  id bigint generated always as identity primary key,
  fonte text not null,
  iniciada_em timestamptz not null default now(),
  terminada_em timestamptz,
  status text not null check (status in ('rodando','ok','erro')),
  linhas int not null default 0,
  erro text
);

-- ===================== DADOS DO ASSINANTE =====================

create table public.perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  frequencia text not null default 'diario' check (frequencia in ('diario','semanal')),
  aceite_privacidade_em timestamptz not null default now()
);

create table public.seguindo (
  user_id uuid not null references public.perfis(user_id) on delete cascade,
  parlamentar_id text not null references public.parlamentares(id) on delete cascade,
  desde timestamptz not null default now(),
  primary key (user_id, parlamentar_id)
);

create table public.envios_alerta (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.perfis(user_id) on delete cascade,
  enviado_em timestamptz not null default now(),
  qtd_votos int not null,
  status text not null
);

-- ===================== ÍNDICES =====================

create index on public.parlamentares (uf);
create index on public.mandatos (parlamentar_id);
create index on public.proposicoes (ano);
create index on public.autorias (parlamentar_id);
create index on public.votacoes (data desc);
create index on public.votacoes (proposicao_id);
create index on public.votos (parlamentar_id);
create index on public.despesas (parlamentar_id, ano, mes);
create index on public.emendas (parlamentar_id);
create index on public.emendas (municipio_id);
create index on public.seguindo (parlamentar_id);
create index on public.envios_alerta (user_id);

-- ===================== SEGURANÇA POR LINHA (RLS) =====================
-- Ligada em TODAS as tabelas. Robôs e equipe usam a chave mestra (service role), que ignora RLS.

do $$
declare t text;
begin
  foreach t in array array[
    'estados','municipios','parlamentares','mandatos','proposicoes','autorias',
    'votacoes','votos','orientacoes','despesas','emendas','transferencias',
    'arrecadacao','tabelas_imposto'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "leitura publica" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

alter table public.artigos enable row level security;
create policy "so publicados" on public.artigos
  for select to anon, authenticated using (publicado = true);

-- coletas: RLS ligada e nenhuma política = invisível pelo site
alter table public.coletas enable row level security;

alter table public.perfis enable row level security;
create policy "dono le" on public.perfis
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono altera" on public.perfis
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono apaga" on public.perfis
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.seguindo enable row level security;
create policy "dono le" on public.seguindo
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono segue" on public.seguindo
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono deixa" on public.seguindo
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.envios_alerta enable row level security;
create policy "dono le" on public.envios_alerta
  for select to authenticated using ((select auth.uid()) = user_id);

-- Leitores só leem: escrita pelo site é sempre negada nas tabelas públicas
revoke insert, update, delete on all tables in schema public from anon;
revoke insert, update, delete on
  public.estados, public.municipios, public.parlamentares, public.mandatos, public.proposicoes,
  public.autorias, public.votacoes, public.votos, public.orientacoes, public.despesas,
  public.emendas, public.transferencias, public.arrecadacao, public.artigos,
  public.tabelas_imposto, public.coletas, public.envios_alerta
from authenticated;

-- ===================== PERFIL NO PRIMEIRO LOGIN =====================

create function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.criar_perfil() from public, anon, authenticated;

create trigger ao_criar_conta
  after insert on auth.users
  for each row execute function public.criar_perfil();
