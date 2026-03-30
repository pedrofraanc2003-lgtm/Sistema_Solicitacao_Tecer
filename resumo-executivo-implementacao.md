# Resumo executivo — implementação do módulo de laudos de análise de óleo

---

## Visão geral

Este documento descreve a implementação de um módulo web para leitura, processamento e exibição de relatórios de análise de óleo exportados no formato `.xls`. A interface combina uma grade de cards por equipamento (visão de frota) com um painel lateral de detalhe por compartimento, priorizando velocidade de triagem e clareza de situação.

---

## 1. Fonte de dados

### Formato do arquivo

- Exportação padrão do sistema de análise em `.xls` (formato legado Excel)
- Uma linha por amostra analisada
- Primeira linha contém os cabeçalhos
- Encoding: UTF-8 com possíveis caracteres especiais em português

### Colunas utilizadas

| Coluna | Nome no header | Posição | Tipo |
|--------|---------------|---------|------|
| Equipamento | `Equipamento` | C (índice 2) | string |
| Compartimento | `Compartimento` | D (índice 3) | string |
| Óleo | `Oleo` | M (índice 12) | string |
| Laudo completo | `Laudo` | Q (índice 16) | string longa |
| Condição resumida | `Condicao` | R (índice 17) | enum |
| Nr. Laudo | `Nr.Laudo` | G (índice 6) | string |
| Data Coleta | `Data Coleta` | H (índice 7) | string dd/mm/aaaa |

### Valores possíveis da coluna `Condicao`

```
Ok/Normal
Atenção/Acompanhar
Trocar/Intervir
Ok/Normal - Atenção/Acompanhar
Atenção/Acompanhar - Trocar/Intervir
```

> A coluna pode conter combinações com ` - ` como separador. A criticidade deve ser determinada pela situação **mais grave** presente na string.

### Regra de prioridade para criticidade

```
Trocar/Intervir  →  nível CRÍTICO  (vermelho)
Atenção          →  nível ALERTA   (amarelo)
Ok/Normal        →  nível OK       (verde)
```

---

## 2. Pipeline de processamento (front-end)

### 2.1 Upload do arquivo

- Input `type="file"` aceitando `.xls` e `.xlsx`
- Leitura via `FileReader.readAsArrayBuffer()`
- Parse com biblioteca **SheetJS** (`xlsx` via CDN ou npm)

```js
// Exemplo de leitura
const workbook = XLSX.read(arrayBuffer, { type: 'array' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
```

### 2.2 Extração das colunas relevantes

- Localizar o índice de cada coluna pelo nome do header (linha 0)
- Não assumir posições fixas — buscar pelo nome para robustez
- Ignorar linhas onde `Equipamento` esteja vazio

```js
// Exemplo de mapeamento dinâmico
const headers = rows[0];
const idx = {
  equipamento: headers.indexOf('Equipamento'),
  compartimento: headers.indexOf('Compartimento'),
  oleo: headers.indexOf('Oleo'),
  laudo: headers.indexOf('Laudo'),
  condicao: headers.indexOf('Condicao'),
  nrLaudo: headers.indexOf('Nr.Laudo'),
  dataColeta: headers.indexOf('Data Coleta'),
};
```

### 2.3 Normalização dos dados

Cada linha válida vira um objeto `Amostra`:

```ts
type Amostra = {
  equipamento: string;       // ex: "EP-12"
  compartimento: string;     // ex: "0001 - CARTER MOTOR"
  oleo: string;              // ex: "15W40"
  laudo: string;             // texto longo do parecer
  condicao: string;          // valor bruto da coluna
  criticidade: 'ok' | 'alerta' | 'critico';  // calculado
  nrLaudo: string;
  dataColeta: string;
};
```

Função de cálculo de criticidade:

```js
function calcularCriticidade(condicao = '') {
  const c = condicao.toLowerCase();
  if (c.includes('trocar') || c.includes('intervir')) return 'critico';
  if (c.includes('aten')) return 'alerta';
  return 'ok';
}
```

### 2.4 Agrupamento por equipamento

Agrupar o array de `Amostra[]` em um `Map<string, Amostra[]>` keyed por `equipamento`.

A criticidade do equipamento como um todo é determinada pela amostra mais crítica dentro dele:

```js
function criticidadeEquipamento(amostras) {
  if (amostras.some(a => a.criticidade === 'critico')) return 'critico';
  if (amostras.some(a => a.criticidade === 'alerta')) return 'alerta';
  return 'ok';
}
```

---

## 3. Estrutura de dados final para os componentes

### Objeto `Equipamento` (alimenta os cards — Variante B)

```ts
type Equipamento = {
  id: string;                    // ex: "EP-12"
  criticidade: 'ok' | 'alerta' | 'critico';
  totalCompartimentos: number;
  amostras: Amostra[];
};
```

### Objeto `Amostra` expandido (alimenta o painel lateral — Variante C)

Ver seção 2.3 acima.

---

## 4. Componentes de interface

### 4.1 Tela principal — Grade de cards (Variante B)

**Layout:** grid responsivo, `repeat(auto-fill, minmax(220px, 1fr))`

**Card de equipamento:**

| Elemento | Conteúdo |
|---------|---------|
| Nome | `equipamento` em destaque (ex: EP-12) |
| Subtítulo | `N compartimentos` |
| Borda lateral esquerda | cor por `criticidade` do equipamento |
| Linhas internas | uma por compartimento: nome + badge de status |

**Cores de criticidade:**

| Status | Borda / Badge | Fundo badge |
|--------|--------------|-------------|
| `critico` | `#E24B4A` | `#FCEBEB` / texto `#A32D2D` |
| `alerta` | `#EF9F27` | `#FAEEDA` / texto `#854F0B` |
| `ok` | `#639922` | `#EAF3DE` / texto `#3B6D11` |

**Interação:** clique no card (ou em um compartimento específico) abre o painel lateral com a amostra selecionada.

---

### 4.2 Painel lateral de detalhe (Variante C)

Abre ao lado direito da grade (ou como drawer/modal em telas menores) sem trocar de rota.

**Campos exibidos:**

| Campo | Fonte |
|-------|-------|
| Equipamento | `amostra.equipamento` |
| Compartimento | `amostra.compartimento` |
| Óleo | `amostra.oleo` |
| Nr. Laudo | `amostra.nrLaudo` |
| Data Coleta | `amostra.dataColeta` |
| Condição | badge com `amostra.condicao` |
| Laudo completo | texto longo, com quebra de linha |

**Navegação:** setas ou lista de compartimentos do mesmo equipamento para navegar sem fechar o painel.

---

### 4.3 Barra superior

| Elemento | Comportamento |
|---------|--------------|
| Botão "Importar XLS" | dispara o `input[type=file]` |
| Nome do arquivo carregado | exibido após upload |
| Filtros de status | pills clicáveis: Todos / Ok / Atenção / Trocar |
| Contador | `N equipamentos · X críticos` |

Filtros afetam apenas quais cards aparecem na grade; o painel lateral não é afetado.

---

## 5. Dependências recomendadas

| Biblioteca | Uso | Fonte |
|-----------|-----|-------|
| **SheetJS** (`xlsx`) | parse do `.xls` / `.xlsx` | npm ou CDN |
| Nenhuma outra obrigatória | layout e lógica em JS/CSS puro | — |

> Se o projeto já usa React, Vue ou outro framework, os componentes descritos acima mapeiam diretamente para componentes funcionais sem necessidade de libs adicionais além do SheetJS.

---

## 6. Fluxo completo resumido

```
[Usuário abre o app]
        ↓
[Clica em "Importar XLS"]
        ↓
[FileReader lê o arquivo como ArrayBuffer]
        ↓
[SheetJS converte para array de linhas]
        ↓
[Parser extrai colunas por nome de header]
        ↓
[Normalização → array de Amostra[]]
        ↓
[Agrupamento → Map<equipamento, Amostra[]>]
        ↓
[Cálculo de criticidade por equipamento]
        ↓
[Renderização da grade de cards (Variante B)]
        ↓
[Clique num card]
        ↓
[Abertura do painel lateral (Variante C)]
        com todos os campos da amostra selecionada
```

---

## 7. Observações para implementação

- O arquivo `.xls` exportado pelo sistema foi identificado como **Excel 2007+ internamente**, apesar da extensão `.xls`. O SheetJS lida com ambos os formatos transparentemente via `XLSX.read()`.
- A coluna `Laudo` contém textos longos em maiúsculas. Recomenda-se aplicar `text-transform: none` e exibir em caixa mista para melhor legibilidade no painel.
- A coluna `Compartimento` tem formato `XXXX - NOME` (ex: `0001 - CARTER MOTOR`). Considerar exibir apenas a parte após o ` - ` nos badges do card para economizar espaço, mantendo o código completo no painel.
- Múltiplas amostras podem existir para o mesmo equipamento + compartimento (histórico de coletas). O card deve exibir a **amostra mais recente** por `dataColeta`. O painel pode oferecer acesso ao histórico.

---

*Documento gerado com base na análise do arquivo `Relatório de análise completo.xls` — TECER TERM. PORT. CEARÁ LTDA / Obra: PECÉM*
