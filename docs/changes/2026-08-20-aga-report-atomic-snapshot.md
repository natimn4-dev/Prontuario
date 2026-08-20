# Geração atômica do relatório AGA

## Contexto

O relatório AGA já limitava escalas e problemas ao horizonte da consulta selecionada e validava a integridade paciente ↔ consulta ↔ documento. Porém, a leitura do contexto clínico e a criação do `DocumentSnapshot` aconteciam em transações separadas. Entre essas etapas, outra gravação poderia alterar o estado longitudinal usado para construir o documento.

## Alteração

A geração do relatório AGA agora executa, dentro da mesma transação `Serializable`:

1. leitura da consulta e identidade persistida do paciente;
2. cálculo do horizonte longitudinal da consulta selecionada;
3. leitura das escalas e problemas pertencentes a esse horizonte;
4. validação fail-closed da integridade do contexto;
5. construção e sanitização do modelo destinado à família/cuidadores;
6. renderização do texto;
7. versionamento e persistência do `DocumentSnapshot` `AGA_REPORT`;
8. registro do evento de auditoria do documento.

A operação reutiliza a política já adotada pelo plano de medicamentos para repetir integralmente a transação em colisões de versão (`P2002`) e conflitos/deadlocks serializáveis (`P2034`).

## Segurança clínica

- nenhum score, ponto de corte, classificação ou interpretação foi alterado;
- nenhuma orientação clínica nova foi adicionada;
- o `patientId` continua derivado da consulta persistida no servidor;
- a sanitização do relatório para família/cuidadores permanece ativa;
- a mudança apenas reduz a possibilidade de snapshot documental ser persistido a partir de um contexto longitudinal que mudou durante a geração.
