# Accessibility

Requisitos mínimos do PA-CDS:

- foco visível para links, botões, inputs, selects, checkboxes e radios;
- contraste suficiente entre texto e fundo;
- significado não dependente apenas de cor;
- labels associados aos campos;
- `aria-label`, `aria-labelledby`, `aria-current` e regiões live quando aplicáveis;
- navegação por teclado completa;
- áreas clicáveis confortáveis;
- estados disabled reconhecíveis;
- mensagens de erro em texto;
- componentes responsivos sem perda de conteúdo;
- tabelas com cabeçalhos claros e `<th scope>`;
- gráficos com `role="img"`, `aria-label` e descrição textual suficiente.

## Busca de paciente

O estado da busca deve ser anunciado por `aria-live` sem confundir carregamento, ausência de resultado e erro.

Requisitos:

- campo com label visível `Nome ou parte do nome`;
- Enter executa a mesma busca do botão;
- loading textual/semântico;
- `401`, `403`, `400` e `500` recebem mensagens diferentes de `200 + []`;
- resultado mantém nome, nascimento, status da consulta e alerta de identidade/homônimo em texto;
- uma resposta antiga abortada não deve apagar um resultado novo válido;
- foco e teclado alcançam `Continuar consulta`/`Abrir paciente`.

## Navegação lateral

A seção ativa usa `aria-current="location"`. Em telas menores, a navegação horizontal deve continuar operável por teclado e toque.

## Gráfico longitudinal

Os estados são diferenciados por posição vertical, forma do marcador, borda/preenchimento e legenda textual. As cores das dimensões ajudam na identificação, mas não são o único canal de informação. Estado atual, ausência de avaliação e discordância devem possuir equivalentes textuais.

## Relatório e plano de medicamentos

- headings mantêm hierarquia semântica;
- tabelas usam cabeçalhos de coluna/linha adequados;
- check visual de horário no plano de medicamentos recebe contexto textual/`aria-label` na tela;
- bloqueios de identidade ou reconciliação usam `role="alert"`;
- controles desabilitados permanecem identificáveis;
- nenhuma informação essencial depende apenas da cor.

## Impressão

O documento impresso deve preservar contraste e não depender de fundos coloridos para compreensão. Navegação, botões, controles de edição, foco visual e metadados exclusivamente operacionais devem ficar fora da superfície impressa.