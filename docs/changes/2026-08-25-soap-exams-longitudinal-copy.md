# Evolução SOAP: exames longitudinais e cópia clínica

## Escopo

- adiciona uma caixa de texto para exames laboratoriais e de imagem na seção Objetivo do SOAP;
- persiste um registro de exames por paciente e consulta, sem alterar o JSON SOAP v1 já validado;
- mostra, nas consultas subsequentes, todos os registros anteriores de exames em ordem cronológica reversa;
- mantém o registro da consulta atual separado do histórico, evitando duplicação silenciosa;
- oferece cópia do SOAP, dos exames, das escalas preenchidas e do conjunto combinado;
- copia das escalas somente nome, pontuação/resultado, classificação e interpretação persistidos na consulta atual; nunca copia respostas item a item nem escalas ausentes.

## Salvaguardas

- vínculo composto entre consulta e paciente no banco;
- horizonte temporal exclui consultas futuras;
- histórico falha fechado ao receber dados de outro paciente;
- consulta finalizada permanece imutável;
- controle de concorrência do SOAP também protege a gravação de exames;
- cópia do SOAP continua bloqueada enquanto a reconciliação medicamentosa não estiver validada;
- clientes anteriores que não enviem `examsText` não apagam registros existentes.

## Verificação

- `npm test`: 470 testes aprovados;
- `npm run typecheck`: aprovado;
- `next build --webpack` com configuração sintética segura: aprovado;
- migração Prisma validada e cliente regenerado localmente.
