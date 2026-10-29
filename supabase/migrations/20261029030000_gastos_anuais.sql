-- Anos antes da legislatura atual (até 2022) ficam como total do ano por categoria (mes = 0), para caber no plano gratuito.
alter table public.gastos_mensais drop constraint if exists gastos_mensais_mes_check;
alter table public.gastos_mensais add constraint gastos_mensais_mes_check check (mes between 0 and 12);
comment on column public.gastos_mensais.mes is '1 a 12; 0 = total do ano (anos até 2022)';
