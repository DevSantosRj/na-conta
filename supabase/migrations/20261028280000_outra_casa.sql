-- Mesma pessoa nas duas Casas: a ficha da Câmara e a do Senado apontam uma para a outra.
-- Só é preenchido quando nome civil completo E data de nascimento são iguais nas duas fontes oficiais.
alter table public.parlamentares add column if not exists outra_casa_id text references public.parlamentares(id) on delete set null;
alter table public.parlamentares add column if not exists data_nascimento date;
create index if not exists parlamentares_outra_casa_idx on public.parlamentares (outra_casa_id);
