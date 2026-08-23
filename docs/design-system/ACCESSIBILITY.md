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
- tabelas com cabeçalhos claros;
- gráficos com `role="img"`, `aria-label` e descrição textual suficiente.

## Navegação lateral

A seção ativa usa `aria-current="location"`. Em telas menores, a navegação horizontal deve continuar operável por teclado e toque.

## Gráfico longitudinal

Os estados são diferenciados por posição vertical, forma do marcador, borda/preenchimento e legenda textual. As cores das dimensões ajudam na identificação, mas não são o único canal de informação.

## Impressão

O documento impresso deve preservar contraste e não depender de fundos coloridos para compreensão.