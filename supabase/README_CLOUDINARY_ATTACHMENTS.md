Para concluir a migração de anexos para o Cloudinary, execute estes passos no projeto Supabase.

1. Rode os SQLs de estrutura:
   arquivo: `supabase/request_attachments_hardening.sql`
   arquivo: `supabase/request_attachments_cloudinary.sql`

2. Faça deploy da Edge Function:
```bash
supabase functions deploy request-attachments
```

3. Configure os secrets da função:
```bash
supabase secrets set CLOUDINARY_CLOUD_NAME=SEU_CLOUD_NAME
supabase secrets set CLOUDINARY_API_KEY=SUA_API_KEY
supabase secrets set CLOUDINARY_API_SECRET=SEU_API_SECRET
```

4. Garanta que o projeto já tenha os secrets padrão do Supabase:
```bash
supabase secrets set SUPABASE_URL=https://SEU-PROJETO.supabase.co
supabase secrets set SUPABASE_ANON_KEY=SUA_ANON_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
```

5. Opcionalmente migre anexos antigos com o script:
```bash
node scripts/migrate-request-attachments-to-cloudinary.mjs
```

Variáveis exigidas pelo script:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Observações:

- O frontend não precisa de secrets do Cloudinary.
- O Cloudinary fica somente no backend da Edge Function e no script de migração.
- O script não apaga arquivos do Supabase Storage; ele apenas migra e atualiza metadados.
