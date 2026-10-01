# Cognição: orientações familiares por fase da demência

## Problema e mudança

As orientações contextualizadas eram breves e a montagem do relatório cortava a cognição em dois itens. A partir do FAST aplicado na consulta atual, o relatório apresenta a fase leve (4), moderada (5), moderadamente grave (6A–6E) ou grave (7A–7F), com explicação funcional e orientações de autonomia, planejamento, comunicação, segurança, apoio ao cuidador e conforto conforme a fase. A classificação e os escores existentes não foram alterados.

O texto foi adaptado da solicitação clínica da médica. A orientação por fase depende exclusivamente de um estágio FAST válido da consulta atual. Katz, Barthel, Lawton, MoCA e GDS-15 não atribuem fase de demência. GDS-15 é depressão, não a Escala de Deterioração Global. Ausência de FAST atual mantém as orientações existentes; ausência de avaliação continua omitindo o domínio. O relatório preserva as orientações específicas de sintomas neuropsiquiátricos e observações cognitivas coletadas.

A capacidade decisória é individual e específica à decisão. Estágio grave não equivale automaticamente a últimos dias de vida. Alimentação/sonda, representação jurídica e cuidados paliativos são assuntos para decisão com equipe/pessoa/família, sem prescrição ou incapacidade automática. As orientações permanecem sujeitas à revisão médica já exigida antes do compartilhamento.

## Fontes

- NICE NG97: https://www.nice.org.uk/guidance/ng97/chapter/recommendations — planejamento, suporte ao cuidador, avaliação das causas de sofrimento e cuidados paliativos segundo as necessidades.
- Diretriz italiana adaptada da NICE NG97 (2024), PMID 39544104: https://pubmed.ncbi.nlm.nih.gov/39544104/ — cuidado individualizado, participação da pessoa e suporte familiar. Referência adicionada ao modelo do relatório.
- Estágios clínicos de Reisberg: https://www.alzinfo.org/understand-alzheimers/clinical-stages-of-alzheimers/ — contextualização das fases; correspondência FAST 4/5/6/7 já existente no domínio.

## Escopo e validação local

- Somente textos/modelo de orientações, limite da cognição, testes e paginação da linha Cognição na tabela. Nenhuma alteração de banco, API, salvamento, SOAP, medicamentos ou regras das escalas.
- 911 testes golden master aprovados, incluindo isolamento, persistência e regressões existentes; novos cenários verificam fase atual, recarga dos dados serializados, imutabilidade dos dados de origem, FAST histórico, dependência física e NPI.
- Typecheck completo e de domínio aprovados. Compilação de produção Next.js/webpack aprovada. O pipeline `npm run build` completo com migrations/prestart depende do MySQL/ambiente e será validado na CI; não foi executado localmente contra produção.
- Chromium: tabela real extraída do componente e renderizada com os estilos atuais e dados sintéticos FAST 4, 5, 6A e 7E. Sem overflow horizontal a 390 px. PDFs A4 contêm todas as orientações; inspeção visual da fase grave sem corte. A linha pode continuar na página seguinte sem cortar cada item. Esta verificação é da tabela, não do fluxo autenticado completo.
- Publicação/CI/merge/deploy e smoke pós-release devem ser confirmados separadamente.
