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
8. relatório final sem a tabela completa de medicamentos;
9. plano de medicamentos em rota própria A4/read-only;
10. gráfico longitudinal aprovado preservado;
11. foco/acessibilidade;
12. nenhum conteúdo clínico inventado.

## Fluxos clínicos críticos

### Busca de paciente existente

É bloqueante. Para aceitar uma mudança:

- nome completo e parcial devem funcionar;
- caixa, acentos e espaços repetidos não podem impedir correspondência canônica;
- termos do mesmo nome podem estar em ordem diferente;
- controles negativos evidentes não podem gerar falso positivo;
- dados históricos inconsistentes devem continuar localizáveis pelo fallback limitado enquanto o backfill não eliminar a dependência;
- `401`, `403`, `400`, `500` e `200 + []` devem permanecer semanticamente distintos;
- busca falha nunca autoriza criar duplicata como solução;
- fingerprint, homônimos, identificadores, transação serializável e auditoria não podem ser enfraquecidos.

### Documentos compartilháveis

Relatório final e plano de medicamentos são contratos de produto separados. Alterar um não autoriza incorporar ou esconder o outro por CSS de impressão.

## Alterações permitidas

Correções visuais incrementais podem ser feitas em branch dedicada. Mudança intencional da identidade visual ou da composição estrutural aprovada exige prévia e aprovação explícita antes de merge/deploy.

## Proteções automatizadas

Golden masters devem proteger tokens, estrutura clínica, separação dos documentos, A4, gráfico longitudinal, estados da busca e ausência de regressões de segurança. Testes MySQL devem cobrir isolamento paciente-consulta e busca de pacientes históricos/sintéticos.

Os testes são uma barreira contra regressões estruturais, não substituem revisão visual humana.

## QA visual obrigatório

Antes de aprovação de uma PR que altere relatório/impressão, revisar com dados sintéticos:

- 1440 px;
- 1280 px;
- 768 px;
- 390 px;
- A4 portrait do relatório;
- A4 portrait do plano de medicamentos.

Verificar overflow, clipping, fontes, bordas, tabela, gráfico, contraste, foco, alinhamento e quebras de página.

## Gráfico aprovado

O componente `CapacityDimensionHistoryChart` e seu CSS são referência aprovada. Mudanças em estrutura, seis dimensões, cores de séries, marcador atual, legenda, comparabilidade ou causalidade exigem revisão metodológica + visual.

## Deploy

Fluxo obrigatório para esta classe de mudança:

branch → CI → testes de integração → prévia visual/funcional → **aprovação explícita** → tirar PR de draft → merge → deploy Hostinger → confirmar `CLINICAL_RELEASE=PRESTART_OK` → limpar cache quando necessário → `/api/health` → smoke autenticado.

Não fazer merge/deploy apenas porque build ou endpoint está verde. Produção só é considerada atual após smoke funcional de busca, consulta, relatório e plano de medicamentos.