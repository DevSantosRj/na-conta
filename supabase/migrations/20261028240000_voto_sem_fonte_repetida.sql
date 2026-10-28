-- O link oficial de cada voto é o mesmo da votação (votacoes.fonte_url).
-- Deixar de repetir esse texto em cada voto economiza espaço para o histórico completo.
alter table public.votos alter column fonte_url drop not null;
update public.votos set fonte_url = null where fonte_url is not null;
