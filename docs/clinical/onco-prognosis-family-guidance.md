# Orientações domiciliares — ECOG e Karnofsky

Rodada de 27/10/2026. Base: `77caa94cd265f6655e0ce7fc7a81b4dc5a4681f8`.

## Pedido e implementação

Substituição integral das orientações genéricas de oncogeriatria e prognóstico por texto baseado no material fornecido e revisado pela geriatra. Linguagem acolhedora de relatório entregue após avaliação domiciliar: ajuda concreta, participação do paciente, respeito ao ritmo, privacidade, conforto e descanso de quem cuida. Não remete à família a tarefa de procurar uma avaliação que o próprio geriatra já realizou. Equipamentos e cuidados específicos dependem do plano individual registrado, sem inventar indicação.

O relatório seleciona somente o bloco do escore atual exato: ECOG 0–4 ou KPS 100–10, em passos de dez. Não há arredondamento, conversão entre escalas ou herança de resultado histórico. Escore ausente ou inesperado não gera estágio. Sem avaliação do domínio, não se cria orientação. Outros instrumentos do domínio sem ECOG/KPS recebem apenas apoio geral, sem presumir capacidade funcional. Charlson, quando avaliado, recebe explicação breve reescrita, sem previsão individual de sobrevida.

Os cálculos, classificações, SOAP, medicamentos, banco e tabelas não mudam. Baixo desempenho não determina sozinho internação, restrição de tratamento ou fim de vida. KPS 10 orienta cuidados finais apenas se confirmados na avaliação médica. Texto e tabela usam o mesmo módulo; revisão humana continua obrigatória antes de compartilhar. Snapshots anteriores são preservados.

## Fontes

- Material educativo fornecido pela geriatra nesta conversa, com revisão de tom e autorização de implantação.
- ECOG-ACRIN: https://ecog-acrin.org/resources/ecog-performance-status/ — conferidas as descrições de ECOG e Karnofsky em 27/10/2026. ECOG: Oken et al., 1982, PMID 7165009; desenvolvida pelo Eastern Cooperative Oncology Group, hoje ECOG-ACRIN Cancer Research Group. Karnofsky e Burchenal, 1949. Sem equivalência automática entre escalas. As frases são adaptação educativa do material fornecido, não tradução literal das escalas.
- PMID 31806655: concordância entre paciente e profissional em avaliação de desempenho; escuta e contextualização.
- PMID 34991091: propriedades do índice de Charlson; sem certeza sobre sobrevida individual.

## Validação prevista

Regressões por todos os escores, dados ausentes/inesperados, consulta anterior, isolamento de paciente, serialização, igualdade texto/tabela, contato preservado e outros domínios. CI completa com MySQL efêmero, SOAP, medicamentos, revisão humana, build e navegador autenticado. Cenário sintético ECOG 2/KPS 60/Charlson gera capturas desktop/mobile/print e PDF A4 para inspeção; nenhum prontuário real é usado. Smoke público após deploy confirma release, saúde, assets e autenticação.

Validação local concluída: 953 golden masters, 7 testes específicos, `validate:repo`, `typecheck`, `typecheck:domain`, `git diff --check` e `next build --webpack` com configuração sintética. O build guardado completo e os testes MySQL serão executados na CI com banco efêmero, sem acesso ao banco de produção. A inspeção visual depende das capturas Chromium da CI.
