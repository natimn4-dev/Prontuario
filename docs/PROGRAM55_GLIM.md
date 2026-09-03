# Programa 55+ — contrato clínico GLIM

## Referência implementada

- Jensen GL, Cederholm T, et al. GLIM consensus approach to diagnosis of malnutrition: A 5-year update. JPEN J Parenter Enteral Nutr. 2025;49(4):414-427. doi:10.1002/jpen.2756.
- O update de 2025 mantém os critérios fenotípicos de perda de peso, baixo IMC e massa muscular reduzida; e os etiológicos de redução da ingestão/assimilação e inflamação/carga da doença.

## Regra diagnóstica

A interface é apoio à decisão e não substitui julgamento profissional.

O sistema sugere que os critérios GLIM estão preenchidos quando há:

- pelo menos 1 critério fenotípico presente; e
- pelo menos 1 critério etiológico presente.

## Fenotípicos

### Perda de peso involuntária

Diagnóstico:
- >5% em até 6 meses; ou
- >10% em mais de 6 meses.

Gravidade:
- Estágio 1: 5–10% em até 6 meses ou 10–20% em mais de 6 meses;
- Estágio 2: >10% em até 6 meses ou >20% em mais de 6 meses.

Os valores exatamente em 5% e 10% são sinalizados para revisão profissional porque a tabela diagnóstica publicada usa `>` enquanto a tabela de gravidade inclui os limites inferiores.

### IMC

Para idade <70 anos:
- fenótipo presente / Estágio 1: IMC <20 kg/m²;
- Estágio 2: IMC <18,5 kg/m².

Para idade >=70 anos:
- fenótipo presente / Estágio 1: IMC <22 kg/m²;
- Estágio 2: IMC <20 kg/m².

No Programa 55+, pacientes com 70 anos completos usam a faixa `>=70`.

### Massa muscular reduzida

Pode confirmar critério fenotípico quando registrada por método apropriado e documentado. O sistema não tenta graduar automaticamente Estágio 1 versus Estágio 2 pela massa muscular, porque o update GLIM de 2025 informa que não há dados suficientes para uma graduação geral entre métodos.

## Etiológicos

### Redução da ingestão ou assimilação

Considerar o critério quando registrado pelo profissional, incluindo:
- <=50% das necessidades energéticas por >1 semana;
- qualquer redução por >2 semanas; ou
- condição gastrointestinal crônica que prejudique assimilação/absorção.

### Inflamação ou carga da doença

Pode ser estabelecida por julgamento clínico diante de doença, infecção ou lesão associada à atividade inflamatória. Marcadores como PCR podem apoiar a avaliação, mas não são requisito obrigatório do sistema.

## Segurança clínica

- Nenhuma escala clínica existente é alterada.
- Nenhum cutoff de instrumento já consolidado é modificado.
- O geriatra/profissional continua escolhendo os instrumentos aplicados.
- O resultado GLIM permanece identificado como sugestão até revisão profissional explícita.
- O MAPA 55+ só exibe o resultado GLIM quando `clinicianDecision = CONFIRMED`.
- O campo textual GLIM anterior é preservado como observação clínica complementar/legado.
- Não há integração automática com API da Tera Science; valores de bioimpedância são registrados conforme equipamento ou laudo.
