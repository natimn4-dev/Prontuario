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

## PatientHeader / ConsultationHeader

Nome do paciente deve ser inequívoco. Consulta deve mostrar data, tipo, status e alerta de identidade quando aplicável.

## ConsultationSidebar

Desktop: sticky, marca profissional + paciente + sete etapas. Tablet/mobile: faixa horizontal rolável sem esconder conteúdo.

## MedicationTable

Medicamento e dose + horários estruturados. Não substituir por frequência genérica quando checkboxes de horário existirem.

## ScaleCard

Escalas agrupadas em uma única caixa por domínio. Seleção por checkbox; formulário estruturado abre após seleção; resultado e estado aplicado ficam visíveis.

## CapacityDimensionHistoryChart

Small multiples por dimensão, eixo de consultas real, marcador da consulta atual, estados clínicos por posição/forma/texto, interrupção de linha quando instrumentos não são comparáveis.