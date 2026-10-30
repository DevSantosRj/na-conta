-- Limite de envio do link de login (além do limite do próprio Supabase Auth):
-- no máximo 3 links por e-mail e 10 por conexão (IP) a cada hora.
-- Guarda só o resumo criptográfico (hash) do e-mail e do IP, nunca o valor em si; registros somem após 1 dia.
create table if not exists public.limite_envios (
  chave text not null,             -- 'email:<sha256>' ou 'ip:<sha256>'
  em timestamptz not null default now()
);
create index if not exists limite_envios_chave_em on public.limite_envios (chave, em);
alter table public.limite_envios enable row level security;
revoke all on public.limite_envios from anon, authenticated;

create or replace function public.pode_enviar_link(email_hash text, ip_hash text)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  por_email int;
  por_ip int;
begin
  if email_hash !~ '^[0-9a-f]{64}$' or ip_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  delete from public.limite_envios where em < now() - interval '1 day';
  select count(*) into por_email from public.limite_envios where chave = 'email:' || email_hash and em > now() - interval '1 hour';
  select count(*) into por_ip from public.limite_envios where chave = 'ip:' || ip_hash and em > now() - interval '1 hour';
  if por_email >= 3 or por_ip >= 10 then
    return false;
  end if;
  insert into public.limite_envios (chave) values ('email:' || email_hash), ('ip:' || ip_hash);
  return true;
end $$;

revoke all on function public.pode_enviar_link(text, text) from public;
grant execute on function public.pode_enviar_link(text, text) to anon, authenticated;
