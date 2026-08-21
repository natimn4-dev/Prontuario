# Janela temporal explícita nos gráficos de escalas

## Objetivo

Permitir que históricos longos sejam explorados com menor carga visual sem descartar a trajetória completa do paciente.

## Alteração

O gráfico longitudinal passa a oferecer três janelas de apresentação quando há mais de seis registros: **Todo o histórico**, **Últimos 12 registros** e **Últimos 6 registros**.

A seleção atua somente sobre a visualização do SVG. A tabela textual abaixo do gráfico continua exibindo todos os registros, independentemente da janela escolhida. O padrão permanece **Todo o histórico**.

## Segurança clínica

- nenhum escore, classificação, tendência ou regra de comparabilidade é recalculado;
- os segmentos desenhados continuam sendo os segmentos previamente validados pelo domínio;
- a janela apenas filtra pontos e segmentos já existentes para apresentação;
- a tendência clínica textual continua vindo do modelo longitudinal completo;
- mudança de versão do instrumento continua sinalizada pelo histórico completo;
- nenhum dado persistido é alterado.

## Acessibilidade e impressão

O seletor possui rótulo explícito e foco de teclado. Em telas pequenas, o controle passa para uma coluna. A tabela completa permanece como alternativa textual acessível. O seletor não é impresso.
