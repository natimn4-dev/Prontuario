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

Horários são dados estruturados. Manhã/tarde/noite/ao dormir devem usar checkbox quando esse é o modelo disponível. Não substituir silenciosamente por texto de frequência.

## Sinais vitais e antropometria

Campos numéricos mostram unidade ao lado. Valores ausentes são vazios. Validação deve bloquear erros claramente impossíveis sem impedir casos clínicos extremos reais.

## Vacinação

Estados estruturados e separados da tabela de medicamentos. O sistema não prescreve automaticamente produto, dose ou esquema.