-- Limpeza autorizada pelo Marcos em 28/10/2026: o que ficou antigo e não será usado.
-- Índice de busca substituído por proposicoes_ementa_busca (sem acento).
drop index if exists public.proposicoes_ementa_trgm;
-- Tabela de notas individuais: substituída por gastos_mensais (somas por mês e categoria). Estava vazia.
drop table if exists public.despesas;
-- Tabelas de IR/INSS: o Meu imposto usa as tabelas oficiais no código (src/lib/imposto.ts, com teste). Estava vazia.
drop table if exists public.tabelas_imposto;
