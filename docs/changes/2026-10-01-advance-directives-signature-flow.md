# Auditoria: botões de assinatura das diretivas desabilitados

Base: `968aa7f9d8a6d63b4fe7bf210c8e94ea1310705f`.

## Diagnóstico

O sintoma confirmado foi o bloqueio dos botões VIDaaS e Bird ID antes de abrir o provedor. A etapa de relatório era desmontada ao navegar para diretivas ou finalização. O estado local da prévia e do snapshot para assinatura se perdia, embora o snapshot permanecesse salvo. Ao voltar, os dois provedores recebiam `snapshot = null`. Além disso, finalizar a consulta não preparava a versão final do relatório: a versão anterior continuava inelegível, corretamente, por ter sido gerada em rascunho.

## Correção

- Preserva somente os dados da prévia no workspace da consulta, identificados pelo consultationId; os componentes pesados continuam desmontados entre etapas. A página recebe chave por consulta, evitando compartilhar estado entre pacientes/consultas.
- Ao abrir o relatório de uma consulta finalizada sem uma prévia final, gera uma nova versão FINALIZED. Nunca altera ou promove o snapshot anterior. As confirmações de revisão começam desmarcadas.
- A revisão explícita continua habilitando cada documento separadamente. Ambos os provedores recebem o snapshot final efetivamente exibido.
- Explica a necessidade de finalizar, de preparar a prévia ou de ter diretivas salvas. Uma falha de geração oferece nova tentativa explícita e não repete POST em um loop.

Não muda conteúdo clínico, SOAP, medicamentos, PDF, credenciais, configuração de provedores ou schema. Não assina automaticamente. Não altera nem apaga dados/snapshots existentes. Estado da prévia permanece apenas na memória da consulta, sem localStorage.

## Validação

- Suíte golden e typecheck completo/de domínio, build Next.js e segurança do repositório.
- Navegação interativa dos componentes reais com dados sintéticos: rascunho bloqueado; prévia preservada ao desmontar/remontar; entrada após finalização gera uma versão final; revisão habilita VIDaaS e Bird; revisão é reiniciada ao reabrir; retry de erro e ausência de diretivas permanecem seguros; responsividade e A4.
- E2E autenticado do CI usa MySQL efêmero, snapshot real e página real. Verifica os bloqueios HTTP de rascunho e snapshot anterior à finalização nos dois provedores, a persistência entre etapas e o envio do snapshot correto. A autorização externa é interceptada somente no teste; não usa certificado real.
- A conclusão criptográfica no provedor exige autorização pessoal do titular do certificado e não foi executada pelo agente. A correção trata o bloqueio anterior à autorização informado pela usuária.

Release: `2026-10-01-diretivas-assinatura-fluxo-v1`.
