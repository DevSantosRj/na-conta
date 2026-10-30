# Como voltar atrás

Guia para quando uma versão nova do Na Conta der problema no ar.

## 1. Site com erro depois de uma publicação (mais comum)

A Vercel guarda todas as versões publicadas. Voltar para a anterior leva segundos e não precisa de novo build.

1. Abra https://vercel.com/devsantosrjs-projects/na-conta/deployments
2. Na versão anterior que estava boa (marcada como "Production" antes da atual), clique nos três pontinhos → **Instant Rollback** (ou **Promote to Production**).
3. Confirme. O endereço do site passa a mostrar a versão antiga na hora.
4. Depois, corrija o código e publique de novo. Enquanto o rollback estiver ativo, a Vercel não troca a produção sozinha: a nova versão precisa ser promovida (ou o rollback desfeito) na mesma tela.

Testado em 30/10/2026: versão com erro proposital revertida em menos de 1 minuto (ver Planta, etapa 6).

## 2. Mudança no banco que deu errado

- Cada mudança no banco é um arquivo em `supabase/migrations/`, em ordem de data. Para desfazer, cria-se uma migração nova que faz o contrário (ex.: `drop` do que foi criado, `revoke` do que foi liberado). Nunca editar uma migração que já foi aplicada.
- Dados dos robôs (votos, gastos, emendas, transferências) podem ser recarregados a qualquer momento pelo workflow **Coleta de dados** no GitHub (Actions → Coleta de dados → Run workflow, com as fontes e anos desejados).
- Dados dos leitores (perfis e quem cada um segue) não existem em nenhuma fonte externa. **Backup diário só existe no Supabase Pro** (7 dias de cópias). No plano grátis não há cópia automática.

## 3. Robô de coleta com falha

O GitHub abre um aviso "Coleta falhou" atribuído ao DevSantosRj, com o motivo. O site continua mostrando os dados da última coleta boa. Depois de corrigir, rode o workflow de novo e feche o aviso.

## 4. Chave vazada

1. Supabase: Settings → API Keys → gerar nova chave (secret) e revogar a antiga.
2. Atualizar o segredo correspondente no GitHub (Settings → Secrets and variables → Actions) e na Vercel (Settings → Environment Variables), e publicar de novo.
