# ISI — registro simplificado e seguro (2026-08-21)

## Objetivo
Adicionar a ISI — Insomnia Severity Index / Índice de Gravidade de Insônia — ao fluxo clínico no mesmo padrão simplificado de MEEM/MoCA: registrar somente a **pontuação total de uma escala já aplicada**, sem reproduzir o questionário protegido dentro do prontuário.

## Decisão clínica e de produto
A ISI fica disponível no domínio **Sono** dentro da caixa única **Escalas clínicas**, com um único campo numérico de 0 a 28.

O prontuário:
- não apresenta os sete itens;
- não apresenta as alternativas do instrumento;
- não traduz, parafraseia ou administra eletronicamente o formulário;
- recebe apenas o total obtido em uma ISI/IGI já aplicada por meio autorizado;
- calcula automaticamente a faixa de interpretação a partir do total informado;
- persiste escore, classificação, interpretação, data e consulta;
- mantém a direção longitudinal `higher-worse` para comparação temporal;
- integra resultados alterados ao apoio ao Plano por Problema, sempre sujeito à revisão médica e sem prescrição automática.

## Faixas adotadas
- 0–7: sem sintomas clinicamente significativos pela faixa de referência;
- 8–14: sintomas de insônia abaixo do limiar;
- 15–21: sintomas de intensidade moderada;
- 22–28: sintomas de intensidade grave.

O resultado é apresentado como gravidade de sintomas/rastreio e **não estabelece diagnóstico isoladamente**.

## Evidência clínica revisada
1. Bastien CH, Vallières A, Morin CM. *Validation of the Insomnia Severity Index as an outcome measure for insomnia research*. Sleep Med. 2001;2(4):297-307. PMID 11438246.
2. Castro LS. *Adaptação e validação do Índice de Gravidade de Insônia (IGI): Caracterização Populacional, Valores Normativos e Aspectos Associados*. UNIFESP, 2011. Validação em amostra adulta da cidade de São Paulo.
3. Mapi Research Trust / ePROVIDE — catálogo oficial da ISI, incluindo tradução Portuguese for Brazil e condições específicas para reprodução/implementação eletrônica do formulário.

## Licenciamento
O gate específico de licença da ISI foi retirado desta implementação porque o aplicativo **não reproduz nem administra o instrumento**; ele apenas registra um escore total previamente obtido, como já ocorre nas entradas simplificadas de MEEM/MoCA.

Isso não autoriza inserir futuramente os sete itens no prontuário. Se houver decisão de oferecer o questionário completo, será necessária nova revisão documental da licença/permissão eletrônica e da versão brasileira oficial antes de qualquer implementação.

## QA obrigatório
- campo único `score`;
- somente inteiros entre 0 e 28;
- rejeitar valores negativos, acima de 28 ou decimais;
- rejeitar campos extras que simulem respostas dos itens;
- fronteiras 7/8, 14/15 e 21/22;
- persistência e reabertura do escore;
- histórico longitudinal;
- integração profissional não prescritiva;
- ausência de qualquer texto dos sete itens no domínio ou endpoint.
