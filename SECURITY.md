# Segurança

Este repositório é público por escolha: o Na Conta defende transparência e mostra o próprio código.

## O que nunca entra aqui

- Chaves de acesso (Supabase, Resend, Claude, Portal da Transparência). Elas ficam só nos cofres da Vercel e do GitHub.
- Arquivos `.env` com valores reais (o `.gitignore` bloqueia; só o modelo `.env.example`, sem valores, é versionado).
- E-mails ou qualquer dado de assinantes. Esses dados vivem apenas no banco, protegido por regras de acesso por linha (RLS).

## Proteções ativas

- Varredura de segredos a cada envio (`gitleaks`, no workflow `Verificação`).
- Proteção de envio de segredos do GitHub (Settings › Code security).
- Workflows com permissão mínima de leitura; chaves não ficam disponíveis para cópias (forks) de terceiros.

## Encontrou um problema?

Não abra uma issue pública. Fale direto com DevSantos pelo X: [@DEVSANTOSRJ](https://x.com/DEVSANTOSRJ).
