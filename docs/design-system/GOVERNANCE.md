# Governance

## Regra de ouro

Mudanças de metodologia, segurança, persistência, infraestrutura ou fluxo clínico não podem trocar silenciosamente o design aprovado.

## Antes de merge

Toda PR que tocar UI deve verificar:

1. tokens PA-CDS preservados;
2. página inicial e busca coerentes com o target;
3. sidebar clínica preservada em desktop e responsiva em mobile;
4. escalas ainda em caixa única por domínio;
5. problemas clínicos e geriátricos distinguíveis;
6. horários de medicamentos não reduzidos indevidamente;
7. relatório A4 vertical e marca profissional preservados;
8. gráfico longitudinal aprovado preservado;
9. foco/acessibilidade;
10. nenhum conteúdo clínico inventado.

## Alterações permitidas

Correções visuais incrementais podem ser feitas em branch dedicada. Mudança intencional da identidade visual exige prévia e aprovação explícita antes de merge/deploy.

## Proteções automatizadas

`tests/golden-master/clinical-design-system.test.ts` protege tokens, estrutura da sidebar, caixa de escalas, camada premium do relatório e gráfico longitudinal.

Os testes são uma barreira contra regressões estruturais, não substituem revisão visual humana.

## Gráfico aprovado

O componente `CapacityDimensionHistoryChart` e seu CSS são referência aprovada. Mudanças em estrutura, seis dimensões, cores de séries, marcador atual, legenda, comparabilidade ou causalidade exigem revisão metodológica + visual.

## Deploy

Fluxo recomendado:

branch → CI → prévia visual/funcional → aprovação → merge → deploy Hostinger → limpar cache quando necessário → `/api/health` → smoke funcional.

Não fazer merge/deploy apenas porque a alteração clínica está correta se a interface divergir do PA-CDS.