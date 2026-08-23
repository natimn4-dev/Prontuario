# Tokens

## Cor

| Token | Valor | Uso |
|---|---:|---|
| `--primary` | `#5f2a91` | ação principal, navegação ativa, marca |
| `--primary-strong` | `#48206f` | hover, títulos institucionais |
| `--primary-soft` | `#f4eefb` | superfícies selecionadas e realces |
| `--primary-soft-strong` | `#eadcf8` | seleção de texto e realce reforçado |
| `--ink` | `#272331` | texto principal |
| `--muted` | `#6f6879` | metadados e texto secundário |
| `--line` | `#e7e1ec` | bordas/divisórias |
| `--background` | `#f8f7fb` | fundo da aplicação |
| `--surface` | `#ffffff` | cards e superfícies |
| `--focus` | `#6b55d9` | foco visível |
| `--success` | `#267a4b` | sucesso/estado positivo |
| `--warning` | `#9b6500` | atenção |
| `--danger` | `#a43a4b` | erro/risco |

Os oito primeiros tokens formam o contrato cromático do **Minimal Clinical Premium** para relatório e plano de medicamentos. A identidade principal não deve voltar para a antiga paleta marrom/cinza e não deve depender de cor para comunicar estado clínico.

## Tipografia

Stack web: `Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

- H1: 30–48 px, peso alto, line-height curto.
- H2: 20–26 px.
- H3: 15–20 px.
- body: 13–17 px conforme contexto.
- labels: 11–13 px, peso 700/750.
- captions/metadados: 9–12 px.
- impressão: adaptar para pt/mm sem reduzir abaixo do legível.

No documento A4, tipografia deve permanecer sans-serif, limpa, com hierarquia curta. Identificadores técnicos, schema e snapshots não podem competir com paciente, data, conteúdo clínico ou assinatura.

## Espaçamento

Escala recomendada: 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40 px.

Cards clínicos usam em geral 20–24 px em desktop e 16 px em mobile. Em A4, preservar espaço em branco e reduzir decoração antes de reduzir legibilidade.

## Bordas e elevação

- `--radius-sm`: 10 px
- `--radius-md`: 14 px
- `--radius-lg`: 20 px
- `--shadow-sm`: separação discreta de card
- `--shadow-md`: sidebar / superfícies principais

Sombras nunca devem competir com conteúdo clínico e devem ser removidas ou minimizadas no print.

## A4 e impressão

- formato obrigatório das duas saídas compartilháveis: `A4 portrait`;
- margens devem ser explícitas em `@page`;
- cabeçalho de tabela repetível;
- blocos clínicos críticos usam `break-inside: avoid` quando viável;
- navegação, botões e campos de edição nunca pertencem à superfície impressa.

## Cores do gráfico longitudinal aprovado

As dimensões possuem identidade visual própria e estável:

- Funcionalidade: `var(--primary)`
- Locomoção: `#9a7440`
- Cognição: `#4f7189`
- Psicológico: `#996277`
- Vitalidade: `#5f8068`
- Sensorial: `#6d6b82`

Essas cores distinguem séries; estado clínico continua representado por posição vertical, marcador e texto.