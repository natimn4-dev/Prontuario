# Clinical Forms

## Princípios

- reduzir cliques sem sacrificar rastreabilidade;
- labels sempre visíveis;
- unidades separadas do valor numérico;
- controles nativos estruturados sempre que adequados;
- preservar `não avaliado` como ausência explícita;
- não usar placeholder como único rótulo;
- manter tab order previsível;
- salvar com feedback inequívoco.

## Busca de paciente existente

O campo usa rótulo `Nome ou parte do nome`, suporta Enter e botão `Localizar paciente`.

A correspondência final deve ser decidida pela função canônica da aplicação, tolerando caixa, acentos, espaços repetidos, nome parcial e termos em ordem diferente quando pertencem ao mesmo nome. O índice `normalizedFullName` pode acelerar a consulta, mas não substitui a validação canônica.

A interface deve distinguir claramente:

- carregamento;
- nenhum resultado real (`200 + []`);
- busca inválida (`400`);
- autenticação necessária (`401`);
- falta de permissão (`403`);
- falha interna (`500`).

Resultado válido exibe identidade suficiente para conferência, alerta de homônimo quando aplicável e status de consulta ativa. `DRAFT`/`IN_REVIEW` direciona para `Continuar consulta`; sem consulta ativa, `Abrir paciente`.

Falha de busca nunca deve oferecer recadastro automático como substituição. Fingerprint, homônimos, identificadores fortes e confirmação de identidade permanecem independentes da lógica de pesquisa.

## Escalas

Na caixa única `Escalas clínicas`:

1. selecionar por checkbox;
2. exibir o formulário do instrumento;
3. usar radio/checkbox/lista/número conforme definição;
4. calcular/interpretar no servidor quando aplicável;
5. persistir por consulta;
6. mostrar estado `Aplicada`;
7. disponibilizar resultado ao histórico longitudinal.

MEEM e MoCA podem usar pontuação numérica com interpretação contextual validada. ISI permanece sujeita às restrições de licenciamento/versão autorizada já registradas no projeto.

## Problemas

Problemas clínicos e geriátricos devem ficar visualmente separados. Mudanças de status e planos sugeridos exigem revisão profissional quando prevista pela regra clínica.

## Medicamentos

Horários são dados estruturados. O contrato vigente inclui:

- manhã;
- almoço;
- tarde;
- noite;
- ao deitar;
- se necessário.

Não substituir silenciosamente horários reais por `2x/dia`, `3x/dia` ou outro texto de frequência. Nome/apresentação, dose, via e observações permanecem separados dos momentos estruturados.

A página de impressão de medicamentos é read-only e só pode usar o regime efetivo da consulta após validação do contexto paciente-consulta e da reconciliação/status histórico.

## Sinais vitais e antropometria

Campos numéricos mostram unidade ao lado. Valores ausentes são vazios. Validação deve bloquear erros claramente impossíveis sem impedir casos clínicos extremos reais.

## Vacinação

Estados estruturados e separados da tabela de medicamentos. O sistema não prescreve automaticamente produto, dose ou esquema.