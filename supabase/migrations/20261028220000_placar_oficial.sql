-- Placar oficial da votação, como a fonte publica. Existe votação com placar publicado
-- e voto individual em branco no arquivo da Câmara (ex.: C-2645346-18, 404 × 61).
alter table public.votacoes
  add column placar_sim int,
  add column placar_nao int,
  add column placar_outros int;
