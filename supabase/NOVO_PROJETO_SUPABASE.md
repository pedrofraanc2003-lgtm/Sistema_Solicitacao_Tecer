# Novo projeto Supabase

## Diagnóstico

O problema de Storage não está só na ocupação atual. O desenho do projeto facilita reincidência:

- O bucket `anexos` recebe arquivos sem limites de tamanho e tipo no schema atual.
- O frontend grava anexos no Storage e também replica referências dentro do `jsonb attachments` em `requests`.
- A tabela `request_attachments` existe, mas no fluxo atual era tratada como opcional.
- As políticas antigas permitiam acesso muito amplo, inclusive com histórico de `anon` em tabelas e objetos.
- Não há trilha operacional para identificar órfãos, anexos gigantes, anexos duplicados ou crescimento por solicitação.

## Estratégia recomendada

Criar um novo projeto Supabase é a decisão correta se o projeto atual está comprometido e/ou desorganizado no Storage. A troca vale a pena quando você quer:

- zerar buckets problemáticos sem carregar lixo histórico;
- reaplicar RLS e Auth com regras coerentes;
- migrar só dados válidos;
- deixar um baseline reproduzível para homologação e produção.

## O que aplicar no projeto novo

Use o arquivo [new_project_storage_rebuild.sql](/Users/Pedro/Downloads/Sistema_Solicitacao_Tecer/supabase/new_project_storage_rebuild.sql) como base inicial. Ele faz o seguinte:

- recria o schema principal;
- torna `request_attachments` a fonte de verdade dos anexos;
- adiciona `size_bytes` e `deleted_at` para auditoria e governança;
- restringe o bucket `anexos` a `authenticated`;
- limita uploads a `JPG`, `PNG`, `WEBP` e `PDF`;
- fixa limite de 10 MB por arquivo no bucket;
- restringe caminhos do bucket ao prefixo `requests/`;
- mantém `requests.attachments` apenas como compatibilidade transitória.

## Ordem de migração

1. Criar o novo projeto Supabase.
2. Executar [new_project_storage_rebuild.sql](/Users/Pedro/Downloads/Sistema_Solicitacao_Tecer/supabase/new_project_storage_rebuild.sql).
3. Publicar a Edge Function administrativa já existente em [index.ts](/Users/Pedro/Downloads/Sistema_Solicitacao_Tecer/supabase/functions/admin-manage-user/index.ts).
4. Migrar primeiro `users`, `equipments`, `requests`, `audit_logs` e `workshop_kanban_items`.
5. Migrar anexos válidos para `storage/anexos/requests/<request_id>/...`.
6. Inserir metadados correspondentes em `public.request_attachments`.
7. Só depois apontar `.env` para o novo projeto.
8. Validar criação, edição e abertura de anexos antes do corte final.

## Dados que não devem migrar cegamente

- objetos sem solicitação correspondente;
- arquivos fora do prefixo `requests/`;
- extensões não aceitas no padrão novo;
- arquivos acima do limite operacional decidido;
- linhas antigas do `requests.attachments` sem objeto real no bucket.

## Consultas de saneamento no projeto antigo

Antes da migração, rode consultas para decidir o que entra no projeto novo:

```sql
select bucket_id, count(*) as total_objetos
from storage.objects
group by bucket_id
order by total_objetos desc;
```

```sql
select
  coalesce(sum((metadata->>'size')::bigint), 0) as bytes_total
from storage.objects
where bucket_id = 'anexos';
```

```sql
select name, metadata
from storage.objects
where bucket_id = 'anexos'
order by created_at desc
limit 100;
```

```sql
select ra.*
from public.request_attachments ra
left join public.requests r on r.id = ra.request_id
where r.id is null;
```

## Mudanças já aplicadas no app

O código local agora reduz a chance de repetir o problema:

- valida tipo e tamanho antes do upload;
- aceita apenas `JPG`, `PNG`, `WEBP` e `PDF`;
- mantém limite de 10 arquivos por solicitação;
- registra cada upload em `public.request_attachments`;
- apaga o objeto do bucket se o metadado falhar;
- passa a ler anexos via relacionamento `request_attachments`, deixando de depender do JSON duplicado.

## Corte final

Faça o switch apenas quando estes quatro pontos estiverem validados:

- autenticação funcionando;
- criação de solicitação com anexo funcionando;
- edição de solicitação com novo anexo funcionando;
- abertura de anexo por signed URL funcionando.
