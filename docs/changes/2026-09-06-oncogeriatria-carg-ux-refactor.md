# Refatoração da Oncogeriatria — CARG e continuidade de preenchimento

Data: 06/09/2026  
Documento de origem: Documento Técnico de Transferência — Módulo de Oncogeriatria Longitudinal, v1.0  
Baseline: `main` em `6171143`

## Decisão

O CARG está liberado para uso clínico no escopo do Prontuário Aprimorado. A ativação não modifica os gates de licença de outros instrumentos e não altera regras do prontuário geral ou do Programa 55+.

## Implementação clínica

- 11 fatores do modelo Hurria 2011, com fórmula no domínio clínico;
- máximo teórico 23 e faixa observada original 0–19 apresentados separadamente;
- baixo risco: 0–5, 30% de toxicidade grau 3–5 na coorte de derivação;
- risco intermediário: 6–9, 52%;
- alto risco: 10–23, 83%;
- limiar de hemoglobina: menor que 11 g/dL no sexo masculino e menor que 10 g/dL no sexo feminino;
- depuração de creatinina menor que 34 mL/min;
- GI/GU, dose padrão, poliquimioterapia, audição, quedas, ajuda com medicamentos, caminhada e atividade social conforme modelo original;
- nota informativa para idade abaixo de 65 anos, sem bloqueio automático;
- nenhuma conduta antineoplásica automática.

## UX e acessibilidade

- formulário em português, organizado em três blocos: paciente/tratamento, laboratório e avaliação geriátrica;
- alternativas visíveis, com pontos ao lado;
- composição do escore expansível para auditoria;
- erro preserva os dados preenchidos;
- reabertura reutiliza as respostas persistidas do G8 e do CARG;
- idade e sexo de referência podem partir do cadastro, permanecendo conferíveis;
- etapa atual da navegação recebe `aria-current="page"` e realce compatível com o PA-CDS;
- nenhuma escala é selecionada automaticamente.

## Segurança, dados e auditoria

- o servidor valida paciente, episódio, checkpoint e consulta;
- o resultado é recalculado no servidor antes de gravar;
- `ScaleAssessment` permanece como fonte única;
- atualização e criação são transacionais e geram `AuditEvent` sem conteúdo clínico no log;
- migration apenas reativa a definição CARG e atualiza metadados versionados;
- não há envio de dados clínicos a serviço externo.

## Não regressão obrigatória

- isolamento entre pacientes e episódios;
- persistência/reabertura do instrumento;
- cenário sem CARG permanece “Não avaliado”;
- G8, ESAS, Charlson e escalas gerais preservados;
- gráficos continuam separados por código + versão;
- SOAP, medicamentos, relatórios gerais e Programa 55+ não são alterados;
- relatório oncogeriátrico exige revisão clínica explícita antes de copiar, imprimir ou arquivar.

## Pendência clínica preservada

O termo “Pfeifer” do documento-base permanece sem implementação até confirmação do nome, versão e regra de interpretação pelo Responsável pelo Produto.

## Fontes

- Hurria A et al. *J Clin Oncol.* 2011;29(25):3457-3465. PMID 21810685. DOI 10.1200/JCO.2011.34.7625.
- Dale W et al. *J Clin Oncol.* 2023. PMID 37459573. DOI 10.1200/JCO.23.00933.
