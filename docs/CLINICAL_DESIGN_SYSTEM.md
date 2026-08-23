# Prontuário Aprimorado — Clinical Design System

## Status

Contrato visual aprovado para o produto clínico. Alterações metodológicas, clínicas ou de infraestrutura **não podem substituir este sistema de apresentação** sem revisão visual explícita.

## Direção visual: Minimal Clinical Premium

O prontuário deve parecer uma aplicação HealthTech clínica premium, sóbria e de baixa carga cognitiva.

Princípios obrigatórios:

- fundo geral muito claro, levemente frio/lavanda;
- superfícies principais brancas;
- roxo/ameixa institucional como cor primária;
- alto contraste para texto clínico e hierarquia tipográfica forte;
- bordas suaves e discretas;
- sombras mínimas, usadas apenas para separar níveis de superfície;
- bastante espaço em branco e densidade controlada;
- ícones e estados visuais discretos;
- botões primários roxo/ameixa; ações secundárias brancas com borda;
- feedback positivo verde, atenção âmbar e erro vermelho, sempre acompanhados de texto;
- foco visível e navegação por teclado;
- responsividade sem remover conteúdo clínico;
- impressão A4 vertical para documentos destinados a paciente/família.

## Tokens canônicos

Os tokens globais vivem em `src/app/globals.css` e devem ser reutilizados pelos módulos CSS:

- `--primary: #5f2a91`
- `--primary-strong: #48206f`
- `--primary-soft: #f4eefb`
- `--primary-soft-strong: #eadcf8`
- `--ink: #272331`
- `--muted: #6f6879`
- `--line: #e7e1ec`
- `--background: #f8f7fb`
- `--surface: #ffffff`
- `--focus: #6b55d9`

Não reintroduzir a paleta marrom/cinza antiga como identidade principal.

## Estrutura da consulta

Em desktop, a consulta usa duas colunas:

1. barra lateral persistente;
2. área clínica principal.

A barra lateral deve conter:

- marca `Natalia Mendes — Médica Geriatra`;
- identificação resumida do paciente atual;
- as sete etapas: Resumo, Problemas, Medicamentos, SOAP / AGA, Escalas clínicas, Relatório final, Revisão e finalização;
- destaque visual da seção ativa;
- comportamento sticky durante a rolagem.

Em tablet/mobile a navegação vira faixa horizontal rolável e não deve competir com o conteúdo.

## Página inicial

A página inicial deve priorizar `Localizar paciente` e `Cadastrar novo paciente`. O resultado precisa exibir o nome de forma inequívoca e, quando houver consulta ativa, levar ao workspace clínico aprovado.

## Escalas clínicas

As escalas permanecem dentro de uma **única caixa `Escalas clínicas`**, organizadas por domínio. O padrão obrigatório inclui:

- cards por domínio;
- checkbox para selecionar/ativar cada instrumento;
- estado `Aplicada` visível;
- área de resumo das escalas selecionadas;
- perguntas estruturadas com radio, checkbox exclusivo, lista ou número conforme o instrumento;
- cálculo/interpretação sem exigir memorização de pontuação;
- baixa poluição visual;
- conteúdo clínico e licenciamento preservados.

## Problemas e medicamentos

Problemas clínicos e geriátricos devem permanecer visualmente separados, mas dentro do mesmo fluxo da consulta.

A tabela de medicamentos para paciente/família mantém medicamento, dose e horários estruturados por checkbox, com impressão/PDF próprios. Não reduzir horários para texto genérico como `2x/dia` quando o dado estruturado estiver disponível.

## Relatório final

O relatório do paciente/família é A4 vertical e deve conter, quando houver dados registrados:

- marca profissional;
- identificação da consulta e paciente;
- problemas clínicos e geriátricos;
- resultados das escalas;
- evolução longitudinal;
- orientações educativas e práticas;
- sinais de atenção;
- vacinas e prevenção;
- tabela de medicamentos;
- assinatura, CRM-BA 27416 e RQE 24673.

Orientações destinadas ao paciente/família não devem introduzir prescrição ou ajuste medicamentoso automático.

## Proteção contra regressão visual

Mudanças futuras devem preservar:

- tokens canônicos;
- sidebar da consulta;
- responsividade;
- estados de foco;
- relatório A4 vertical;
- hierarquia e baixa densidade visual;
- separação entre regras clínicas e apresentação.

O golden master `clinical-design-system.test.ts` existe para detectar regressões estruturais simples. Ele não substitui revisão visual humana antes do merge/deploy.