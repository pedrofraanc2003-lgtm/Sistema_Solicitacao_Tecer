Para concluir a administracao real de usuarios no Supabase, execute estes passos no projeto Supabase.

1. Rode o SQL de configuracao:
   arquivo: `supabase/admin_users_setup.sql`

2. Garanta que a tabela `users` tenha os campos:
   - `id text primary key`
   - `name text`
   - `email text unique`
   - `username text unique`
   - `role text`
   - `status text`

3. Faça deploy da Edge Function:
```bash
supabase functions deploy admin-manage-user
```

4. Configure os secrets da funcao:
```bash
supabase secrets set SUPABASE_URL=https://SEU-PROJETO.supabase.co
supabase secrets set SUPABASE_ANON_KEY=SUA_ANON_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
```

5. Confirme que o usuario administrador logado:
   - existe em `Authentication > Users`
   - existe na tabela `users`
   - possui `role = 'Admin'`
   - possui `status = 'Ativo'`

6. Depois disso, a tela "Gestao de Usuarios" passa a:
   - criar usuario no `Authentication`
   - criar/atualizar perfil na tabela `users`
   - opcionalmente redefinir senha na edicao

Observacao:
- O deploy da funcao nao foi executado automaticamente daqui.
- Isso depende do Supabase CLI autenticado na sua maquina.
