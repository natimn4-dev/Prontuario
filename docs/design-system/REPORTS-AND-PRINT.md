# Reports and Print

## Regra de produto

**Relatório final** e **plano de medicamentos** são documentos independentes. Não usar `data-print-scope="medications"` + ocultação do restante do relatório como arquitetura principal de impressão.

## Relatório para paciente/família

Formato: A4 vertical.

Preservar, quando houver dados registrados:

- logo e identidade profissional;
- paciente e data da consulta;
- resumo executivo em `Visão geral`, `Pontos de atenção` e `Recomendação principal`;
- problemas clínicos e geriátricos em grupos visualmente distintos;
- resultados de escalas agrupados por domínio;
- evolução longitudinal com o gráfico aprovado de small multiples;
- plano/orientações educativas e práticas;
- orientações por capacidade intrínseca quando registradas;
- sinais de atenção e situações de urgência;
- vacinas e prevenção;
- mensagem de que o plano de medicamentos está disponível em documento separado;
- assinatura profissional;
- CRM-BA 27416 e RQE 24673.

Não destacar `consultationId`, snapshot, schema ou outros identificadores técnicos para paciente/família. Quando necessários, mantê-los fora da superfície impressa ou no apêndice técnico opcional.

Orientações familiares não podem introduzir prescrição, início, suspensão, substituição ou ajuste automático de medicamentos/suplementos.

## Plano de medicamentos

Rota de referência: `/consultations/[id]/medications/print`.

A página deve ser:

- autenticada e autorizada;
- read-only;
- vinculada inequivocamente à consulta e ao paciente;
- baseada no regime efetivo da consulta;
- bloqueada para compartilhamento quando a identidade exige revisão ou a reconciliação/status histórico não permite um plano seguro.

Tabela:

- Medicamento e dose;
- Manhã;
- Almoço;
- Tarde;
- Noite;
- Ao deitar;
- Se necessário;
- Observações.

Via pode aparecer de forma compacta na primeira coluna quando registrada. Não reduzir horários estruturados a frequência textual genérica.

Rodapé obrigatório:

> Esta tabela organiza o cuidado e não substitui a receita médica. Não inicie, suspenda, substitua ou altere medicamentos por conta própria.

Assinatura: Dra. Natalia Mendes · CRM-BA 27416 · RQE 24673.

## Gráfico longitudinal

O gráfico aprovado integra o relatório final e deve:

- manter Independência funcional separada da capacidade intrínseca;
- manter Locomoção, Cognição, Capacidade psicológica, Vitalidade e Capacidade sensorial em small multiples;
- usar tempo real entre consultas;
- destacar consulta atual/mais recente;
- interromper linha quando a comparação não for metodologicamente válida;
- manter proveniência e versão dos instrumentos;
- registrar pontos de inflexão sem inferir causalidade;
- nunca produzir score global, radar, média artificial ou linha única misturando dimensões.

## CSS de impressão

`@page { size: A4 portrait; }` é obrigatório nas duas saídas.

No relatório:

- controles de geração/revisão não aparecem no print;
- metadados técnicos não dominam a hierarquia;
- blocos críticos evitam quebra interna quando possível.

No plano de medicamentos:

- sidebar, botões e controles de edição não aparecem;
- `thead` é repetível;
- linha de medicamento evita quebra entre páginas;
- marca e identificação do paciente permanecem legíveis.

Sombras e fundos decorativos devem ser reduzidos no print; bordas e hierarquia devem permanecer suficientes para leitura.