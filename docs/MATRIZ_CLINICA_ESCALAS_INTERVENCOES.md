# Matriz clínica de escalas e intervenções

## Fonte prevalente

Decisão clínica registrada para o projeto: **`Freitas e Py — Apêndice: Instrumentos de Avaliação` é a fonte prevalente para novas avaliações quando o instrumento estiver documentado nesse apêndice.**

O PDF de terceiros não é copiado para o repositório. O Git contém somente metadados, decisões clínicas e regras derivadas necessárias à rastreabilidade.

### Ordem de autoridade

1. Freitas e Py para estrutura, redação, opções e pontuação que o apêndice efetivamente documenta.
2. Decisão clínica explícita e registrada para aspectos que a fonte não define.
3. Fonte secundária identificada/versionada para instrumentos ausentes do PDF.
4. Legado somente para histórico, compatibilidade e migração; nunca para sobrescrever silenciosamente a fonte prevalente.
5. Lacuna documental permanece `needs-review`; não completar por memória.

## Classificação de disponibilidade clínica

A biblioteca deve distinguir três estados:

- **Aplicação completa** — itens/respostas/cálculo necessários estão versionados e testados.
- **Registro manual/documental** — o formulário ou achado pode ser registrado, mas não há dados suficientes para score/classificação automática segura.
- **Revisão/licença necessária** — ainda não reproduzir/aplicar integralmente até resolver versão, fonte complementar ou restrição de uso.

`needs-review` nunca significa preencher informação ausente por conveniência.

## Situação das escalas prioritárias

| Instrumento | Cobertura Freitas/Py | Situação segura na main | Próxima ação |
|---|---|---|---|
| Katz / ABVD | Define instrumento | Domínio legado existente; fonte primária marcada como adotada | Expor versão compatível em biblioteca clínica e preservar histórico |
| Lawton / AIVD | Define instrumento | 7 itens, 1–3, total 7–21 no protocolo adotado | Expor versão compatível em biblioteca clínica |
| GDS-15 | Define instrumento/chave | Domínio existente | Expor como rastreio; nunca promover a diagnóstico automaticamente |
| Pfeffer | Versão diferente | Legado possui versão de 11 itens | Criar versão Freitas 10 itens; enquanto score/corte não estiverem sustentados, registro documental sem classificação automática |
| MNA-SF | Versão diferente | Existe como instrumento legado | Não apresentar como equivalente à MNA completa |
| MNA completa | Define instrumento A–R | Ainda não é versão clínica da main | Implementar versão própria; manter IMC exatamente 23 como pendência explícita até decisão clínica |
| MEEM | Define formulário | Regra histórica possui cortes próprios | Revisar/versionar cortes antes de promover versão Freitas para novas avaliações |
| MoCA | Define versão própria | Versão histórica não deve ser sobrescrita | Migração versionada antes de uso como versão Freitas |
| SPPB | Define componentes | Regra histórica existe | Nova versão deve preservar medidas brutas/subescores e compatibilidade |
| Mini-Cog | Presente no PDF | Não catalogado como versão aplicável | Implementar/versionar apenas o conteúdo sustentado pela fonte |
| POMA | Presente no PDF | Não catalogado como versão aplicável | Implementar/versionar |
| IQCODE-Br | Presente no PDF | Não catalogado como versão aplicável | Implementar/versionar |
| CES-D | Formulário presente | Sem automação segura definida nesta política | Permitir apenas após revisão de fonte/licença; não inventar score |
| MOS-SSS | Formulário presente | Sem automação segura definida nesta política | Revisão complementar antes de cálculo/interpretação |
| APGAR familiar | Formulário presente | Versão histórica existe | Revisar pontuação/faixas antes de promover versão primária |
| Zarit 22 | Formulário presente | Existem versões reduzidas distintas | Não confundir versões; revisão/licença e versionamento próprios |

## Instrumentos fora do PDF principal

G8, VES-13, SARC-F, FRAIL-BR, CAM, FAST, PPS, ESAS, ECOG, CRASH adaptada, KPS, Charlson e demais instrumentos ausentes da fonte principal podem continuar no sistema somente com fonte secundária explícita/versionada. Eles não devem ser apresentados como derivados de Freitas/Py.

## Regras de migração

Qualquer alteração de versão que mude itens, pontuação, cutoff ou interpretação deve:

1. criar versão explícita nova;
2. preservar assessments históricos na versão antiga;
3. impedir comparação direta entre versões incompatíveis;
4. adicionar testes de borda;
5. registrar fonte e decisão clínica;
6. manter cálculo exclusivamente no domínio/servidor;
7. manter sugestões de problemas/intervenções sujeitas à revisão médica.

## Destino das informações

### SOAP
Somente avaliações realmente aplicadas na consulta-alvo entram como resultados atuais. Valores anteriores precisam ser identificados como históricos.

### Relatório para família/cuidadores
Apresentar achado → significado funcional → orientação prática aprovada → acompanhamento, sem transformar rastreio em diagnóstico nem sugestão automática em prescrição.

### Medicamentos
Escalas podem apoiar reconciliação e revisão, mas nenhuma escala suspende, inicia ou ajusta medicamento automaticamente.
