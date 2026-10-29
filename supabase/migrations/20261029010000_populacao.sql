-- População estimada pelo IBGE (tabela 6579 do SIDRA), por estado e por município, com o ano da estimativa.
alter table public.estados add column if not exists populacao_ano int;
alter table public.municipios add column if not exists populacao bigint;
alter table public.municipios add column if not exists populacao_ano int;
