# Inventário de migração das regras clínicas

Fonte de verdade temporária: `AGA 1.html`, configuração `ESCALAS.meta.versao = 1.0`.

## Regra de governança
Uma escala só recebe o status **testada** depois que seus pontos de corte e sua lógica foram recuperados do legado e cobertos por teste de borda. Não completar lacunas por memória ou por aproximação.

| ID | Dimensão | Status | Cobertura atual |
|---|---|---|---|
| `katz` | Funcionalidade | testada | soma e limites 0–2 / 3–5 / 6 |
| `lawton` | Funcionalidade | testada | 7 / 8–20 / 21 |
| `barthel` | Funcionalidade | testada | 0–19 / 20–35 / 40–55 / 60–95 / 100 |
| `pfeffer` | Funcionalidade | testada | soma e corte 6 |
| `gds15` | Humor | testada | 0–5 / 6–10 / 11–15 + alerta independente do escore |
| `cornell` | Humor/demência | testada | 0–7 / 8–11 / 12–38 + alerta co16 |
| `cam` | Cognição/delirium | testada | algoritmo 1∧2∧(3∨4) + alerta urgente se positivo |
| `moca` | Cognição | testada | 0–17 / 18–25 / 26–30 |
| `meem` | Cognição | testada | cortes por escolaridade |
| `dez_cs` | Cognição | testada | novas avaliações: 0 anos +2; 1–3 anos +1; ≥4 anos +0; limite 10; faixas ≤5 / 6–7 / ≥8. Regra 1–4 anos permanece apenas no legado histórico |
| `frail_br` | Fragilidade | testada | 0 / 1–2 / 3–5 |
| `sarcf` | Nutrição/sarcopenia | testada | 0–3 / 4–10; ≥4 é rastreio/case-finding e não estabelece sarcopenia provável isoladamente |
| `preensao` | Mobilidade/sarcopenia | testada | feminino 16; masculino 27 kgF |
| `velocidade_marcha` | Mobilidade | testada | 4/tempo; ≤0,8 m/s alterado |
| `sentar_levantar_5x` | Mobilidade | testada | ≤15 normal; >15 reduzido |
| `sppb` | Mobilidade | testada | versão atual Freitas/Py: tempos/subescores e corte ≤8 para baixo desempenho físico; faixas 0–6 / 7–9 / 10–12 permanecem somente no legado histórico |
| `antropometria` | Nutrição | testada | IMC, perda ponderal, panturrilha |
| `polifarmacia` | Medicações | testada | 0–1 / 2–3 / 4–7 |
| `stoppfall` | Medicações/quedas | testada | 14 classes do consenso; faixas 0 / 1–2 / 3–14 são priorização local, não ponto de corte validado de risco |
| `kps` | Prognóstico | testada | 90–100 / 70–80 / 10–60 |
| `lace` | Transição de cuidado | testada | pesos do legado + 0–4 / 5–9 / 10–19 |
| `g8` | Rastreio oncogeriátrico | testada | ≤14 positivo; ≥14,5 negativo, incluindo meio ponto |
| `ecog` | Oncogeriatria/desempenho | testada | graus discretos 0–5 conforme ECOG-ACRIN/Oken 1982 |
| `crash_mna_sf` | Oncogeriatria/toxicidade | testada como regra local* | subescores H/NH e combinado; *MNA completo substituído por MNA-SF 12–14 = 0 e 0–11 = 2, sem validação externa |
| `apgar_familiar` | Suporte social | testada | 0–3 / 4–6 / 7–10; procedência dos cortes em revisão |
| `zarit_reduzida` | Suporte social | testada* | 0–10 / 11–16 / 17–28; *golden master testado, referência bibliográfica precisa revisão |
| `charlson` | Prognóstico | testada | 19 pesos + ajuste etário 0–4; faixas de cor são regra local |
| `ves13` | Vulnerabilidade | testada | pesos agregados do legado e corte ≥3 |
| `mna_sf` | Nutrição | testada | 6 itens; IMC prioritário e panturrilha como substituta; 0–7 / 8–11 / 12–14 |
| `zarit_paliativo_7_ms2013` | Suporte social/cuidador | testada | 7 itens 1–5; 7–14 leve / 15–21 moderada / 22 lacuna da fonte / 23–35 grave |
| `fast` | Cognição/funcionalidade | testada | estágios discretos 1–7f; faixas do legado preservadas |
| `pps` | Cuidados paliativos/funcionalidade | testada | níveis 10–100; faixas locais 70–100 / 40–60 / 10–30 |
| `esas` | Cuidados paliativos/sintomas | testada | 9 itens 0–10, total 0–90; faixas da soma são locais + destaque individual >=7 |
| `cfs` | Fragilidade | pendente | não localizada no golden master; requer versão/fonte antes da implementação |
| `prevent` | Risco cardiovascular | mapeada | fluxo manual e faixas identificados |

## Intervenções já separadas da pontuação
O motor `src/domain/interventions.ts` já possui blocos extraídos e testáveis para:
- Lawton;
- Pfeffer;
- Barthel;
- G8;
- polifarmácia;
- SARC-F;
- velocidade de marcha;
- sentar-levantar 5x;
- preensão;
- SPPB;
- LACE;
- APGAR familiar;
- Zarit reduzida;
- Charlson;
- VES-13;
- MNA-SF.

A pontuação não importa nem conhece textos de intervenção. Essa separação é obrigatória para evitar que uma alteração de orientação clínica mude acidentalmente o cálculo da escala.

## Alertas clínicos
`src/domain/clinical-alerts.ts` mantém alertas de segurança separados das orientações à família:
- GDS-15: pesquisa ativa de ideação suicida independentemente do escore;
- Cornell: revisão explícita do item co16; se positivo, alerta urgente;
- CAM positivo: alerta urgente de delirium provável.

## Decisão de segurança
A nova engine **não executa fórmulas clínicas com `Function(...)`**. Fórmulas do legado são convertidas para funções TypeScript explícitas.

## Próxima sequência
1. revisar documentalmente o escore 22 da Zarit institucional;
2. decidir versão/fonte da CFS antes de incluí-la;
3. criar catálogo versionado de referências clínicas para as escalas restantes;
4. ligar a engine testada ao formulário Next.js somente após autenticação e persistência P0;
5. integrar `longitudinal-scales.ts` ao armazenamento de `ScaleAssessment` e ao dashboard “O que mudou?”.

## Arquitetura v7

`src/domain/scale-catalog.ts` centraliza código, versão, dimensão, procedência e vínculo com intervenções. Ele referencia as regras existentes sem alterar pontos de corte. Escalas sem procedência catalogada permanecem `needs-review`; a centralização arquitetural não constitui validação clínica.
