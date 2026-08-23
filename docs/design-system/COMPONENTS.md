# Components

## PrimaryButton

Roxo/ameixa sólido, contraste alto, foco visível, uma ação principal por bloco.

## SecondaryButton

Fundo branco, borda suave, texto `--primary-strong`. Não competir com ação principal.

## ClinicalCard

Superfície branca, borda `--line`, radius 14–18 px, sombra mínima, padding 20–24 px.

## DomainCard

Usado em escalas e dimensões clínicas. Título curto, opções estruturadas, sem parágrafos excessivos.

## ClinicalCheckbox / RadioChoice

Controle nativo sempre que possível, `accent-color: var(--primary)`, área clicável confortável, label textual completa.

## TextInput / Select / NumericMeasurement

Borda discreta, unidade fora do valor numérico, foco visível. Ausência de dado permanece vazia, nunca zero implícito.

## StatusBadge

Pílula pequena com texto. Cor complementa, mas não substitui, o significado.

## ClinicalAlert

- informação/seleção: roxo suave;
- atenção: âmbar suave;
- erro: vermelho suave;
- sucesso: verde suave.

Sempre com texto explícito.

## ClinicalTable

Cabeçalho suave, alinhamento claro, divisórias horizontais discretas, rolagem horizontal quando inevitável. Em impressão, repetir cabeçalho.

## PatientFinder

A busca de paciente existente é componente de fluxo clínico crítico.

Estados obrigatórios e mutuamente distinguíveis:

- `idle`;
- `loading`;
- resultado(s) encontrado(s);
- `200 + []` = nenhum correspondente;
- `400` = busca inválida;
- `401` = sessão expirada/autenticação necessária;
- `403` = sem permissão;
- `500` = falha interna.

O componente mantém `AbortController`, suporte a Enter, botão explícito `Localizar paciente`, região `aria-live` e nunca converte falha técnica em convite automático para cadastrar duplicata.

## PatientHeader / ConsultationHeader

Nome do paciente deve ser inequívoco. Consulta deve mostrar data, tipo, status e alerta de identidade quando aplicável.

## ConsultationSidebar

Desktop: sticky, marca profissional + paciente + sete etapas. Tablet/mobile: faixa horizontal rolável sem esconder conteúdo.

## MedicationTable

Medicamento e dose + horários estruturados. Não substituir por frequência genérica quando checkboxes de horário existirem.

## MedicationPlanPrintPage

Documento independente em `/consultations/[id]/medications/print`.

Contrato:

- server-rendered/read-only;
- autenticado e autorizado;
- consulta resolvida antes do paciente e dos medicamentos;
- validação explícita do vínculo paciente-consulta;
- usa o regime efetivo da consulta e status histórico reconciliado;
- bloqueia impressão quando identidade/homônimo exige revisão;
- mantém manhã, almoço, tarde, noite, ao deitar e se necessário como campos estruturados;
- não exibe sidebar, botões ou controles de edição no print;
- A4 portrait com `thead` repetível e linha de medicamento não quebrada quando viável.

## ScaleCard

Escalas agrupadas em uma única caixa por domínio. Seleção por checkbox; formulário estruturado abre após seleção; resultado e estado aplicado ficam visíveis.

## AgaReportDocumentPreview

Composição documental do relatório final. Deve conter cabeçalho profissional, resumo executivo em três blocos, problemas clínicos/geriátricos separados, resultados por domínio, gráfico longitudinal aprovado, plano de cuidados, orientações por capacidade intrínseca quando existentes, vacinação/prevenção e assinatura.

A tabela completa de medicamentos não pode ser reintroduzida neste componente. O relatório apenas referencia o documento próprio do plano de medicamentos.

## CapacityDimensionHistoryChart

Small multiples por dimensão, eixo de consultas real, marcador da consulta atual, estados clínicos por posição/forma/texto, interrupção de linha quando instrumentos não são comparáveis. A associação temporal nunca deve ser apresentada como causalidade.