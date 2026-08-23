# Foundations

## Objetivo

Reduzir carga cognitiva durante uma consulta geriátrica complexa sem esconder informação clínica relevante.

## Princípios

1. **Contexto do paciente sempre visível.** A consulta deve manter identificação resumida e estado do atendimento próximos à navegação.
2. **Uma ação principal por bloco.** Ações secundárias não devem competir visualmente com salvar/prosseguir/finalizar.
3. **Baixa densidade, alta legibilidade.** Espaço em branco é preferível a divisórias pesadas.
4. **Cor com significado.** Roxo/ameixa identifica produto e interação; verde, âmbar e vermelho representam estados sem depender apenas da cor.
5. **Progressão clínica previsível.** Resumo → Problemas → Medicamentos → SOAP/AGA → Escalas → Relatório → Revisão/finalização.
6. **Conteúdo clínico separado da apresentação.** CSS não define regra clínica; componentes visuais não alteram classificação ou persistência.
7. **Print-first para documentos.** Conteúdo destinado a paciente/família deve continuar legível em A4 vertical.
8. **Responsividade sem perda.** Em telas menores, reorganizar; nunca esconder informação essencial apenas para caber.
9. **Documentos com finalidade inequívoca.** Relatório final e plano de medicamentos não são duas visualizações do mesmo documento: são saídas independentes, com hierarquia e impressão próprias.
10. **Busca de paciente é segurança clínica.** Falha técnica, falha de sessão e ausência real de resultado são estados diferentes. Uma busca que falha não deve induzir recadastro do paciente existente.
11. **Correção antes de otimização.** Busca, identidade e vínculo paciente-consulta devem ser determinísticos antes de otimizações de performance; fallback legado deve ser limitado e rastreável.

## Linguagem visual

- fundo frio/lavanda muito claro;
- superfícies brancas;
- roxo/ameixa institucional;
- texto primário quase preto;
- bordas suaves;
- sombra mínima;
- cantos arredondados moderados;
- tipografia sans-serif limpa;
- ícones lineares quando usados;
- tabelas claras, com cabeçalho suave e alinhamento consistente.

## Documento final

O relatório compartilhado deve parecer um documento médico profissional, não uma página web longa impressa. A composição deve priorizar cabeçalho institucional, resumo executivo, problemas separados, resultados por domínio, trajetória longitudinal, plano de cuidados, prevenção e assinatura. Metadados técnicos permanecem fora da hierarquia principal e, quando necessários, ficam em apêndice ou apenas na camada técnica.

O plano de medicamentos usa página própria, read-only, vinculada inequivocamente à consulta e ao paciente, com horários estruturados preservados.

## Gráfico longitudinal aprovado

O gráfico de capacidade intrínseca e independência funcional é parte do design target e deve ser preservado como **small multiples por dimensão**, não como score composto e não como tabela estatística.

Dimensões:

- Independência funcional;
- Locomoção;
- Cognição;
- Psicológico;
- Vitalidade;
- Sensorial.

A consulta atual/mais recente deve continuar identificável no eixo temporal. Pontos de inflexão mostram associação temporal e não atribuem causalidade.