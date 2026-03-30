# Sistema de Solicitação TECER

Aplicação web para gestão de solicitações, equipamentos, usuários, auditoria e relatórios no contexto do processo PCM da TECER.

## Stack

- React 19
- TypeScript
- Vite
- Supabase
- Google GenAI
- Recharts

## Funcionalidades

- Autenticação local por perfil de usuário
- Gestão de solicitações de manutenção
- Cadastro e consulta de equipamentos
- Gestão de usuários
- Auditoria de ações
- Relatórios operacionais
- Sincronização com Supabase quando configurado

## Requisitos

- Node.js 18 ou superior
- npm

## Instalação

1. Instale as dependências:

```bash
npm install
```

2. Crie um arquivo `.env.local` na raiz do projeto com base em `.env.example`.

3. Configure as variáveis de ambiente:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Observação:

- Os anexos agora usam Cloudinary via Supabase Edge Functions.
- Nenhum secret do Cloudinary deve ficar no frontend.

## Execução

Ambiente de desenvolvimento:

```bash
npm run dev
```

Build de produção:

```bash
npm run build
```

Preview local da build:

```bash
npm run preview
```

## Banco de dados

O projeto utiliza Supabase para persistência remota dos dados.

Tabelas acessadas pela aplicação:

- `requests`
- `equipments`
- `users`
- `audit_logs`
- `request_attachments`

Comportamento da integração:

- Se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estiverem configuradas, a aplicação tenta validar a conexão e sincronizar os dados com o Supabase.
- Se a configuração estiver ausente ou houver falha de comunicação, a aplicação entra em modo local.
- O status da sincronização aparece na interface como indicador de nuvem.
- Falhas de acesso são tratadas com logs mais explícitos para facilitar diagnóstico de `URL`, chave, CORS, projeto pausado ou indisponibilidade de rede.
- Upload e leitura de anexos passam por backend autenticado usando Supabase Edge Functions.

## Anexos no Cloudinary

Arquivos de solicitação são armazenados no Cloudinary em modo privado/autenticado, enquanto o Supabase continua como fonte de verdade dos metadados em `request_attachments`.

Arquivos operacionais:

- `supabase/request_attachments_cloudinary.sql`
- `supabase/README_CLOUDINARY_ATTACHMENTS.md`
- `supabase/functions/request-attachments/index.ts`
- `scripts/migrate-request-attachments-to-cloudinary.mjs`

## Observações

- A chave `VITE_SUPABASE_ANON_KEY` não concede administração total do banco; ela serve para acesso público controlado pelas políticas do Supabase.
- Para operação administrativa real do banco, é necessário usar credenciais administrativas fora do frontend.
