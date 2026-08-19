# Cobertura validada das escalas Freitas/Py

Atualizado em 2026-08-19.

Regra: o Freitas/Py é a fonte clínica principal para instrumentos presentes no apêndice. Quando uma regra de pontuação/corte não está suficientemente definida no apêndice, uma fonte validada/original complementar é registrada na versão nova. Nenhuma avaliação histórica é convertida silenciosamente.

| Instrumento | Código de nova aplicação | Cálculo automático | Observação de segurança |
|---|---|---:|---|
| Katz / ABVD | `katz` | Sim | 0–6; sem gravidade intermediária inventada |
| Lawton / AIVD | `lawton` | Sim | 7–21; sete itens Freitas/Py |
| GDS-15 | `gds15` | Sim | rastreio, nunca diagnóstico automático |
| MNA completa | `mna_full` | Sim | 18 itens; não equivale à MNA-SF |
| Pfeffer FAQ — 10 itens | `pfeffer10` | Sim | não equivale ao legado de 11 itens |
| SPPB | `sppb_freitas` | Sim | tempos brutos preservados; percurso de 3 m do apêndice |
| POMA | `poma_freitas` | Sim | versão Freitas/Py 22–57; sem cutoff Tinetti-28 |
| Mini-Cog | `minicog_freitas` | Sim | 0–5; rastreio positivo 0–2 |
| MEEM | `meem_freitas` | Sim | 0–30; escolaridade contextualiza, não diagnostica |
| Desenho do relógio | `clock_shulman` | Sim | Shulman 0–5 explicitamente versionado |
| MoCA-BR | `moca_br_freitas` | Sim | +1 se escolaridade ≤12; cortes educacionais tratados como rastreio |
| IQCODE-Br — 26 itens | `iqcode_br_26` | Sim | média 1–5; 3,52 como referência de rastreio versionada |
| CES-D — 20 itens | `cesd_br_elderly` | Sim | ≥12 = rastreio positivo na validação brasileira em idosos |
| MOS-SSS — 19 itens | `mos_sss_br_19` | Sim | 0–100 total/domínios; sem cutoff universal automático |
| APGAR familiar | `family_apgar_br_elderly` | Sim | versão validada em idosos do Nordeste; rastreio familiar |
| Zarit — 22 itens | `zarit_br_22` | Sim | 0–88; sem faixas de gravidade importadas de outras populações |

## Ainda fora deste núcleo validado

A **Avaliação funcional breve — 11 domínios** do apêndice permanece documental/revisão específica. Ela não faz parte do conjunto solicitado para cálculo automático nesta rodada e não é usada para criar um escore global de capacidade intrínseca.

## Regras transversais

- score/classificação/interpretação são calculados no domínio/servidor;
- o navegador não envia score pronto;
- `patientId` é derivado da consulta;
- consulta finalizada não aceita nova aplicação;
- resposta ausente, extra ou fora de faixa falha fechado;
- mudanças de versão criam novo `scaleVersion`;
- versões incompatíveis não são ligadas automaticamente em gráficos/tendência;
- instrumento de rastreio não gera diagnóstico, prescrição ou mudança medicamentosa automática.
