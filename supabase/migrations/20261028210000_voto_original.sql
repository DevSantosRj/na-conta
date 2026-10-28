-- Guarda o voto exatamente como a fonte escreveu (ex.: "LS - Licença saúde", "Artigo 17"),
-- para a tela nunca transformar uma ausência justificada em "não votou".
alter table public.votos add column voto_original text;
